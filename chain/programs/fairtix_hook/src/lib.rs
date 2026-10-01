use anchor_lang::prelude::*;
use fairtix_market::{Event, Listing};
use spl_tlv_account_resolution::{account::ExtraAccountMeta, pubkey_data::PubkeyData, state::ExtraAccountMetaList};
use spl_token_2022::extension::{BaseStateWithExtensions, StateWithExtensions, transfer_hook::{TransferHook, TransferHookAccount}};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

declare_id!("8WkPYAkswnyywHpY7VcCwVMsCgmDzMrDtLuT9ZzGyoWD");

#[program]
pub mod fairtix_hook {
    use super::*;

    pub fn initialize_extra_account_meta_list(ctx: Context<InitializeExtraAccountMetaList>) -> Result<()> {
        require_keys_eq!(*ctx.accounts.event.owner, fairtix_market::ID, HookError::InvalidEvent);
        let mint_data = ctx.accounts.mint.try_borrow_data()?;
        let mint = StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&mint_data)?;
        require!(mint.base.mint_authority == anchor_lang::solana_program::program_option::COption::Some(ctx.accounts.event.key()), HookError::InvalidEvent);
        let hook = mint.get_extension::<TransferHook>()?;
        require!(Option::<Pubkey>::from(hook.program_id) == Some(crate::ID), HookError::InvalidEvent);
        let metas = vec![
            ExtraAccountMeta::new_with_pubkey(&ctx.accounts.event.key(), false, false)?,
            ExtraAccountMeta::new_with_pubkey_data(&PubkeyData::AccountData { account_index: 0, data_index: 32 }, false, false)?,
            ExtraAccountMeta::new_with_pubkey_data(&PubkeyData::AccountData { account_index: 2, data_index: 32 }, false, false)?,
        ];
        ExtraAccountMetaList::init::<ExecuteInstruction>(&mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?, &metas)?;
        Ok(())
    }

    #[interface(spl_transfer_hook_interface::execute)]
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        let source_data = ctx.accounts.source.try_borrow_data()?;
        let source = StateWithExtensions::<spl_token_2022::state::Account>::unpack(&source_data)?;
        // Reject calls made directly to the hook, outside Token-2022's transfer path.
        require!(bool::from(source.get_extension::<TransferHookAccount>()?.transferring), HookError::OutsideTransfer);
        let dest_data = ctx.accounts.destination.try_borrow_data()?;
        let destination = StateWithExtensions::<spl_token_2022::state::Account>::unpack(&dest_data)?;
        require!(amount == 1 && source.base.mint == ctx.accounts.mint.key() && destination.base.mint == ctx.accounts.mint.key(), HookError::TransferNotAllowed);
        require_keys_eq!(source.base.owner, ctx.accounts.source_owner.key(), HookError::TransferNotAllowed);
        require_keys_eq!(destination.base.owner, ctx.accounts.destination_owner.key(), HookError::TransferNotAllowed);
        require_keys_eq!(*ctx.accounts.event.owner, fairtix_market::ID, HookError::InvalidEvent);
        let event = Event::try_deserialize(&mut &ctx.accounts.event.try_borrow_data()?[..])?;
        require_keys_eq!(event.mint, ctx.accounts.mint.key(), HookError::InvalidEvent);
        let entering = valid_listing(&ctx.accounts.destination_owner, ctx.accounts.event.key(), ctx.accounts.destination.key(), &event)
            .map(|l| l.seller == source.base.owner && destination.base.amount == 1).unwrap_or(false);
        let leaving = valid_listing(&ctx.accounts.source_owner, ctx.accounts.event.key(), ctx.accounts.source.key(), &event)
            .map(|_| source.base.amount == 0).unwrap_or(false);
        require!(entering || leaving, HookError::TransferNotAllowed);
        Ok(())
    }
}

fn valid_listing(account: &AccountInfo, event: Pubkey, escrow: Pubkey, rules: &Event) -> Option<Listing> {
    if *account.owner != fairtix_market::ID { return None; }
    let data = account.try_borrow_data().ok()?;
    let listing = Listing::try_deserialize(&mut &data[..]).ok()?;
    let nonce = listing.nonce.to_le_bytes();
    let (key, bump) = Pubkey::find_program_address(&[b"listing", event.as_ref(), listing.seller.as_ref(), &nonce], &fairtix_market::ID);
    if key != *account.key || bump != listing.bump || listing.event != event || listing.escrow != escrow || listing.price == 0 || listing.price > rules.max_price() { return None; }
    Some(listing)
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    /// CHECK: Only the marketplace can sign with its Event PDA. Mint authority and owner are checked.
    pub event: Signer<'info>,
    /// CHECK: Token-2022 mint validated in the instruction.
    #[account(owner = spl_token_2022::ID)] pub mint: UncheckedAccount<'info>,
    /// CHECK: SPL TLV account initialized with immutable extra-account metadata.
    #[account(init, payer = payer, space = ExtraAccountMetaList::size_of(3).unwrap(), seeds = [b"extra-account-metas", mint.key().as_ref()], bump)] pub extra_account_meta_list: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    /// CHECK: Token-2022 account with active transfer flag, checked in execute.
    #[account(owner = spl_token_2022::ID)] pub source: UncheckedAccount<'info>,
    /// CHECK: Token-2022 mint, matched against Event.
    #[account(owner = spl_token_2022::ID)] pub mint: UncheckedAccount<'info>,
    /// CHECK: Token-2022 destination, mint and owner checked in execute.
    #[account(owner = spl_token_2022::ID)] pub destination: UncheckedAccount<'info>,
    /// CHECK: Token-2022 validates transfer authority before invoking the hook.
    pub authority: UncheckedAccount<'info>,
    /// CHECK: Canonical immutable TLV account.
    #[account(seeds = [b"extra-account-metas", mint.key().as_ref()], bump)] pub extra_account_meta_list: UncheckedAccount<'info>,
    /// CHECK: Marketplace Event, checked against owner, discriminator and mint.
    pub event: UncheckedAccount<'info>,
    /// CHECK: Source owner resolved from the token account; Listing PDA checked if present.
    pub source_owner: UncheckedAccount<'info>,
    /// CHECK: Destination owner resolved from the token account; Listing PDA checked if present.
    pub destination_owner: UncheckedAccount<'info>,
}

#[error_code]
pub enum HookError {
    #[msg("This ticket can only change hands through Fairtix, so the price cap holds.")] TransferNotAllowed,
    #[msg("The hook can only run during a Token-2022 transfer.")] OutsideTransfer,
    #[msg("The ticket does not belong to this event.")] InvalidEvent,
}
