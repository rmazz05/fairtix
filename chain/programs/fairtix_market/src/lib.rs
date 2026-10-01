use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::{AccountMeta, Instruction}, program::invoke_signed};
use anchor_spl::{associated_token::AssociatedToken, token_2022::Token2022, token_interface::{self, Mint, TokenAccount, MintTo, TransferChecked, CloseAccount}};
use anchor_spl::token_2022_extensions::token_metadata::{token_metadata_initialize, TokenMetadataInitialize};

declare_id!("4NxaE691WuYMs1ScHn6jDByVW8sj6U5w5nT9EXMUaYrF");
pub const HOOK_ID: Pubkey = pubkey!("8WkPYAkswnyywHpY7VcCwVMsCgmDzMrDtLuT9ZzGyoWD");
pub const ADMIN_ID: Pubkey = pubkey!("5coagnKL9pD4mfn4RL1KtWfMZ6jTmBTubQ2G7kUNhJud");

#[program]
pub mod fairtix_market {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        require_keys_eq!(ctx.accounts.admin.key(), ADMIN_ID, MarketError::Unauthorized);
        require!(ctx.accounts.currency_mint.decimals == 2, MarketError::InvalidCurrency);
        ctx.accounts.config.set_inner(Config {
            currency_mint: ctx.accounts.currency_mint.key(), treasury: ctx.accounts.admin.key(),
            primary_fee_bps: 300, resale_fee_bps: 200, bump: ctx.bumps.config,
        });
        Ok(())
    }

    pub fn create_event(ctx: Context<CreateEvent>, event_id: u64, name: String, venue: String, date: i64, face_price: u64, supply: u32, cap_bps: u16, royalty_bps: u16, uri: String) -> Result<()> {
        require!(!name.trim().is_empty() && name.len() <= 96 && !venue.trim().is_empty() && venue.len() <= 96 && uri.len() <= 200, MarketError::InvalidDetails);
        require!(date > Clock::get()?.unix_timestamp && face_price > 0 && face_price <= 100_000_000 && supply > 0 && supply <= 10_000, MarketError::InvalidDetails);
        require!(cap_bps <= 2500, MarketError::InvalidCap);
        require!(royalty_bps <= 1000, MarketError::InvalidRoyalty);
        let event_key = ctx.accounts.event.key();
        ctx.accounts.event.set_inner(Event {
            organizer: ctx.accounts.organizer.key(), mint: ctx.accounts.ticket_mint.key(), event_id,
            face_price, cap_bps, royalty_bps, supply, sold: 0, resales: 0, royalties_earned: 0,
            date, name: name.clone(), venue, bump: ctx.bumps.event,
        });
        let organizer = ctx.accounts.organizer.key();
        let id_bytes = event_id.to_le_bytes();
        let bump = [ctx.bumps.event];
        let seeds: &[&[u8]] = &[b"event", organizer.as_ref(), &id_bytes, &bump];
        // Metadata grows the mint. Fund its final rent before Token-2022 reallocates it.
        let metadata = spl_token_metadata_interface::state::TokenMetadata {
            update_authority: Some(event_key).try_into().unwrap(), mint: ctx.accounts.ticket_mint.key(),
            name: name.clone(), symbol: "FTX".into(), uri: uri.clone(), additional_metadata: vec![],
        };
        let final_size = ctx.accounts.ticket_mint.to_account_info().data_len() + metadata.tlv_size_of()?;
        let extra = Rent::get()?.minimum_balance(final_size).saturating_sub(ctx.accounts.ticket_mint.to_account_info().lamports());
        if extra > 0 {
            anchor_lang::system_program::transfer(CpiContext::new(ctx.accounts.system_program.to_account_info(), anchor_lang::system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(), to: ctx.accounts.ticket_mint.to_account_info(),
            }), extra)?;
        }
        token_metadata_initialize(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TokenMetadataInitialize {
            program_id: ctx.accounts.token_program.to_account_info(), metadata: ctx.accounts.ticket_mint.to_account_info(),
            update_authority: ctx.accounts.event.to_account_info(), mint_authority: ctx.accounts.event.to_account_info(), mint: ctx.accounts.ticket_mint.to_account_info(),
        }, &[seeds]), name, "FTX".into(), uri)?;
        // Separate hook program avoids marketplace -> token -> marketplace reentrancy.
        let discriminator = [92, 197, 174, 197, 41, 124, 19, 3];
        let ix = Instruction { program_id: HOOK_ID, accounts: vec![
            AccountMeta::new(ctx.accounts.payer.key(), true), AccountMeta::new_readonly(event_key, true),
            AccountMeta::new_readonly(ctx.accounts.ticket_mint.key(), false), AccountMeta::new(ctx.accounts.extra_account_meta_list.key(), false),
            AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
        ], data: discriminator[..8].to_vec() };
        invoke_signed(&ix, &[ctx.accounts.payer.to_account_info(), ctx.accounts.event.to_account_info(), ctx.accounts.ticket_mint.to_account_info(), ctx.accounts.extra_account_meta_list.to_account_info(), ctx.accounts.system_program.to_account_info(), ctx.accounts.hook_program.to_account_info()], &[seeds])?;
        Ok(())
    }

    pub fn buy_primary(ctx: Context<BuyPrimary>) -> Result<()> {
        require!(ctx.accounts.event.sold < ctx.accounts.event.supply, MarketError::SoldOut);
        let price = ctx.accounts.event.face_price;
        let fee = portion(price, ctx.accounts.config.primary_fee_bps);
        pay(&ctx.accounts.token_program, &ctx.accounts.currency_mint, &ctx.accounts.buyer_currency, &ctx.accounts.organizer_currency, &ctx.accounts.buyer.to_account_info(), price - fee)?;
        pay(&ctx.accounts.token_program, &ctx.accounts.currency_mint, &ctx.accounts.buyer_currency, &ctx.accounts.treasury_currency, &ctx.accounts.buyer.to_account_info(), fee)?;
        let event = &ctx.accounts.event;
        let id = event.event_id.to_le_bytes(); let bump = [event.bump];
        let seeds: &[&[u8]] = &[b"event", event.organizer.as_ref(), &id, &bump];
        token_interface::mint_to(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), MintTo {
            mint: ctx.accounts.ticket_mint.to_account_info(), to: ctx.accounts.buyer_ticket.to_account_info(), authority: event.to_account_info(),
        }, &[seeds]), 1)?;
        ctx.accounts.event.sold = ctx.accounts.event.sold.checked_add(1).ok_or(MarketError::Arithmetic)?;
        Ok(())
    }

    pub fn list(ctx: Context<List>, nonce: u64, price: u64) -> Result<()> {
        require!(price > 0 && price <= ctx.accounts.event.max_price(), MarketError::OverCap);
        ctx.accounts.listing.set_inner(Listing {
            event: ctx.accounts.event.key(), seller: ctx.accounts.seller.key(), escrow: ctx.accounts.escrow.key(),
            rent_payer: ctx.accounts.payer.key(), nonce, price, created_at: Clock::get()?.unix_timestamp, bump: ctx.bumps.listing,
        });
        // A nested hook must see the freshly-created listing before Anchor's final exit.
        ctx.accounts.listing.exit(&crate::ID)?;
        move_ticket(&ctx.accounts.token_program, &ctx.accounts.ticket_mint, &ctx.accounts.seller_ticket, &ctx.accounts.escrow, &ctx.accounts.seller.to_account_info(), &[
            ctx.accounts.extra_account_meta_list.to_account_info(), ctx.accounts.hook_program.to_account_info(), ctx.accounts.event.to_account_info(), ctx.accounts.seller.to_account_info(), ctx.accounts.listing.to_account_info(),
        ], &[])?;
        Ok(())
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let listing = &ctx.accounts.listing;
        let nonce = listing.nonce.to_le_bytes(); let bump = [listing.bump];
        let seeds: &[&[u8]] = &[b"listing", listing.event.as_ref(), listing.seller.as_ref(), &nonce, &bump];
        move_ticket(&ctx.accounts.token_program, &ctx.accounts.ticket_mint, &ctx.accounts.escrow, &ctx.accounts.seller_ticket, &listing.to_account_info(), &[
            ctx.accounts.extra_account_meta_list.to_account_info(), ctx.accounts.hook_program.to_account_info(), ctx.accounts.event.to_account_info(), ctx.accounts.seller.to_account_info(), listing.to_account_info(),
        ], &[seeds])?;
        close_escrow(&ctx.accounts.token_program, &ctx.accounts.escrow, &listing.to_account_info(), &ctx.accounts.rent_payer.to_account_info(), &[seeds])?;
        Ok(())
    }

    pub fn buy_resale(ctx: Context<BuyResale>) -> Result<()> {
        let price = ctx.accounts.listing.price;
        require!(price <= ctx.accounts.event.max_price(), MarketError::OverCap);
        let royalty = portion(price, ctx.accounts.event.royalty_bps);
        let fee = portion(price, ctx.accounts.config.resale_fee_bps);
        pay(&ctx.accounts.token_program, &ctx.accounts.currency_mint, &ctx.accounts.buyer_currency, &ctx.accounts.seller_currency, &ctx.accounts.buyer.to_account_info(), price - royalty - fee)?;
        pay(&ctx.accounts.token_program, &ctx.accounts.currency_mint, &ctx.accounts.buyer_currency, &ctx.accounts.organizer_currency, &ctx.accounts.buyer.to_account_info(), royalty)?;
        pay(&ctx.accounts.token_program, &ctx.accounts.currency_mint, &ctx.accounts.buyer_currency, &ctx.accounts.treasury_currency, &ctx.accounts.buyer.to_account_info(), fee)?;
        let listing = &ctx.accounts.listing;
        let nonce = listing.nonce.to_le_bytes(); let bump = [listing.bump];
        let seeds: &[&[u8]] = &[b"listing", listing.event.as_ref(), listing.seller.as_ref(), &nonce, &bump];
        move_ticket(&ctx.accounts.token_program, &ctx.accounts.ticket_mint, &ctx.accounts.escrow, &ctx.accounts.buyer_ticket, &listing.to_account_info(), &[
            ctx.accounts.extra_account_meta_list.to_account_info(), ctx.accounts.hook_program.to_account_info(), ctx.accounts.event.to_account_info(), ctx.accounts.buyer.to_account_info(), listing.to_account_info(),
        ], &[seeds])?;
        close_escrow(&ctx.accounts.token_program, &ctx.accounts.escrow, &listing.to_account_info(), &ctx.accounts.rent_payer.to_account_info(), &[seeds])?;
        ctx.accounts.event.resales = ctx.accounts.event.resales.checked_add(1).ok_or(MarketError::Arithmetic)?;
        ctx.accounts.event.royalties_earned = ctx.accounts.event.royalties_earned.checked_add(royalty).ok_or(MarketError::Arithmetic)?;
        Ok(())
    }
}

fn portion(price: u64, bps: u16) -> u64 { ((price as u128 * bps as u128) / 10_000) as u64 }
fn pay<'info>(program: &Program<'info, Token2022>, mint: &InterfaceAccount<'info, Mint>, from: &InterfaceAccount<'info, TokenAccount>, to: &InterfaceAccount<'info, TokenAccount>, authority: &AccountInfo<'info>, amount: u64) -> Result<()> {
    if amount == 0 { return Ok(()); }
    token_interface::transfer_checked(CpiContext::new(program.to_account_info(), TransferChecked {
        from: from.to_account_info(), mint: mint.to_account_info(), to: to.to_account_info(), authority: authority.clone(),
    }), amount, 2)
}
fn move_ticket<'info>(program: &Program<'info, Token2022>, mint: &InterfaceAccount<'info, Mint>, from: &InterfaceAccount<'info, TokenAccount>, to: &InterfaceAccount<'info, TokenAccount>, authority: &AccountInfo<'info>, extras: &[AccountInfo<'info>], seeds: &[&[&[u8]]]) -> Result<()> {
    spl_token_2022::onchain::invoke_transfer_checked(&program.key(), from.to_account_info(), mint.to_account_info(), to.to_account_info(), authority.clone(), extras, 1, 0, seeds)?;
    Ok(())
}
fn close_escrow<'info>(program: &Program<'info, Token2022>, escrow: &InterfaceAccount<'info, TokenAccount>, authority: &AccountInfo<'info>, refund: &AccountInfo<'info>, seeds: &[&[&[u8]]]) -> Result<()> {
    token_interface::close_account(CpiContext::new_with_signer(program.to_account_info(), CloseAccount {
        account: escrow.to_account_info(), destination: refund.clone(), authority: authority.clone(),
    }, seeds))
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut, address = ADMIN_ID)] pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [b"config"], bump)] pub config: Account<'info, Config>,
    #[account(owner = spl_token_2022::ID)] pub currency_mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(event_id: u64)]
pub struct CreateEvent<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    pub organizer: Signer<'info>,
    #[account(init, payer = payer, space = 8 + Event::INIT_SPACE, seeds = [b"event", organizer.key().as_ref(), &event_id.to_le_bytes()], bump)] pub event: Box<Account<'info, Event>>,
    #[account(init, payer = payer, seeds = [b"mint", event.key().as_ref()], bump,
        mint::decimals = 0, mint::authority = event, mint::token_program = token_program,
        extensions::transfer_hook::authority = event, extensions::transfer_hook::program_id = hook_program,
        extensions::metadata_pointer::authority = event, extensions::metadata_pointer::metadata_address = ticket_mint)]
    pub ticket_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: Created and validated by the hook program in CPI.
    #[account(mut, seeds = [b"extra-account-metas", ticket_mint.key().as_ref()], bump, seeds::program = HOOK_ID)] pub extra_account_meta_list: UncheckedAccount<'info>,
    /// CHECK: The fixed executable hook program.
    #[account(address = HOOK_ID, executable)] pub hook_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyPrimary<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    pub buyer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump, has_one = currency_mint, has_one = treasury)] pub config: Account<'info, Config>,
    #[account(mut, has_one = organizer, constraint = event.mint == ticket_mint.key())] pub event: Box<Account<'info, Event>>,
    #[account(mut)] pub ticket_mint: Box<InterfaceAccount<'info, Mint>>,
    pub currency_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: Identity validated against Event; used for canonical ATA creation.
    pub organizer: UncheckedAccount<'info>,
    /// CHECK: Identity validated against Config; used for canonical ATA creation.
    pub treasury: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = ticket_mint, associated_token::authority = buyer, associated_token::token_program = token_program)] pub buyer_ticket: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = currency_mint, associated_token::authority = buyer, associated_token::token_program = token_program)] pub buyer_currency: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = currency_mint, associated_token::authority = organizer, associated_token::token_program = token_program)] pub organizer_currency: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = currency_mint, associated_token::authority = treasury, associated_token::token_program = token_program)] pub treasury_currency: Box<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct List<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    pub seller: Signer<'info>,
    #[account(constraint = event.mint == ticket_mint.key())] pub event: Account<'info, Event>,
    pub ticket_mint: InterfaceAccount<'info, Mint>,
    #[account(init, payer = payer, space = 8 + Listing::INIT_SPACE, seeds = [b"listing", event.key().as_ref(), seller.key().as_ref(), &nonce.to_le_bytes()], bump)] pub listing: Account<'info, Listing>,
    #[account(init, payer = payer, associated_token::mint = ticket_mint, associated_token::authority = listing, associated_token::token_program = token_program)] pub escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, associated_token::mint = ticket_mint, associated_token::authority = seller, associated_token::token_program = token_program)] pub seller_ticket: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Canonical hook metadata account; Token-2022 validates its contents.
    #[account(seeds = [b"extra-account-metas", ticket_mint.key().as_ref()], bump, seeds::program = HOOK_ID)] pub extra_account_meta_list: UncheckedAccount<'info>,
    /// CHECK: Fixed hook executable.
    #[account(address = HOOK_ID, executable)] pub hook_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    pub seller: Signer<'info>,
    #[account(constraint = event.mint == ticket_mint.key())] pub event: Account<'info, Event>,
    pub ticket_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, close = rent_payer, has_one = event, has_one = seller, has_one = escrow, has_one = rent_payer,
        seeds = [b"listing", event.key().as_ref(), seller.key().as_ref(), &listing.nonce.to_le_bytes()], bump = listing.bump)] pub listing: Account<'info, Listing>,
    #[account(mut, associated_token::mint = ticket_mint, associated_token::authority = listing, associated_token::token_program = token_program)] pub escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, associated_token::mint = ticket_mint, associated_token::authority = seller, associated_token::token_program = token_program)] pub seller_ticket: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Rent refund recipient recorded in Listing.
    #[account(mut)] pub rent_payer: UncheckedAccount<'info>,
    /// CHECK: Canonical hook metadata account.
    #[account(seeds = [b"extra-account-metas", ticket_mint.key().as_ref()], bump, seeds::program = HOOK_ID)] pub extra_account_meta_list: UncheckedAccount<'info>,
    /// CHECK: Fixed hook executable.
    #[account(address = HOOK_ID, executable)] pub hook_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct BuyResale<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    pub buyer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump, has_one = currency_mint, has_one = treasury)] pub config: Account<'info, Config>,
    #[account(mut, has_one = organizer, constraint = event.mint == ticket_mint.key())] pub event: Box<Account<'info, Event>>,
    pub ticket_mint: Box<InterfaceAccount<'info, Mint>>,
    pub currency_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: Validated against Listing.
    pub seller: UncheckedAccount<'info>,
    /// CHECK: Validated against Event.
    pub organizer: UncheckedAccount<'info>,
    /// CHECK: Validated against Config.
    pub treasury: UncheckedAccount<'info>,
    #[account(mut, close = rent_payer, has_one = event, has_one = seller, has_one = escrow, has_one = rent_payer,
        seeds = [b"listing", event.key().as_ref(), seller.key().as_ref(), &listing.nonce.to_le_bytes()], bump = listing.bump)] pub listing: Box<Account<'info, Listing>>,
    #[account(mut, associated_token::mint = ticket_mint, associated_token::authority = listing, associated_token::token_program = token_program)] pub escrow: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Rent refund recipient recorded in Listing.
    #[account(mut)] pub rent_payer: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = ticket_mint, associated_token::authority = buyer, associated_token::token_program = token_program)] pub buyer_ticket: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = currency_mint, associated_token::authority = buyer, associated_token::token_program = token_program)] pub buyer_currency: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = currency_mint, associated_token::authority = seller, associated_token::token_program = token_program)] pub seller_currency: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = currency_mint, associated_token::authority = organizer, associated_token::token_program = token_program)] pub organizer_currency: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = currency_mint, associated_token::authority = treasury, associated_token::token_program = token_program)] pub treasury_currency: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Canonical hook metadata account.
    #[account(seeds = [b"extra-account-metas", ticket_mint.key().as_ref()], bump, seeds::program = HOOK_ID)] pub extra_account_meta_list: UncheckedAccount<'info>,
    /// CHECK: Fixed hook executable.
    #[account(address = HOOK_ID, executable)] pub hook_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub currency_mint: Pubkey, pub treasury: Pubkey, pub primary_fee_bps: u16, pub resale_fee_bps: u16, pub bump: u8,
}
#[account]
#[derive(InitSpace)]
pub struct Event {
    pub organizer: Pubkey, pub mint: Pubkey, pub event_id: u64, pub face_price: u64,
    pub cap_bps: u16, pub royalty_bps: u16, pub supply: u32, pub sold: u32, pub resales: u32, pub royalties_earned: u64,
    pub date: i64, #[max_len(96)] pub name: String, #[max_len(96)] pub venue: String, pub bump: u8,
}
impl Event { pub fn max_price(&self) -> u64 { ((self.face_price as u128 * (10_000 + self.cap_bps as u128)) / 10_000) as u64 } }
#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub event: Pubkey, pub seller: Pubkey, pub escrow: Pubkey, pub rent_payer: Pubkey,
    pub nonce: u64, pub price: u64, pub created_at: i64, pub bump: u8,
}
#[error_code]
pub enum MarketError {
    #[msg("Only the configured administrator may initialize the market.")] Unauthorized,
    #[msg("Test credits must use two decimal places.")] InvalidCurrency,
    #[msg("Check the event details, date, ticket quantity and face price.")] InvalidDetails,
    #[msg("The resale cap must be between 0% and 25%.")] InvalidCap,
    #[msg("The organizer royalty must be between 0% and 10%.")] InvalidRoyalty,
    #[msg("This event is sold out.")] SoldOut,
    #[msg("The asking price exceeds the organizer's resale cap.")] OverCap,
    #[msg("The amount is outside the supported range.")] Arithmetic,
}
