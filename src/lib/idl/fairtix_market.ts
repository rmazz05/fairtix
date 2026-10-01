/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fairtix_market.json`.
 */
export type FairtixMarket = {
  address: "4NxaE691WuYMs1ScHn6jDByVW8sj6U5w5nT9EXMUaYrF";
  metadata: {
    name: "fairtixMarket";
    version: "0.1.0";
    spec: "0.1.0";
  };
  instructions: [
    {
      name: "buyPrimary";
      discriminator: [89, 86, 227, 49, 41, 118, 66, 248];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "buyer";
          signer: true;
        },
        {
          name: "config";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 110, 102, 105, 103];
              },
            ];
          };
        },
        {
          name: "event";
          writable: true;
        },
        {
          name: "ticketMint";
          writable: true;
        },
        {
          name: "currencyMint";
          relations: ["config"];
        },
        {
          name: "organizer";
          relations: ["event"];
        },
        {
          name: "treasury";
          relations: ["config"];
        },
        {
          name: "buyerTicket";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "buyer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "buyerCurrency";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "buyer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "currencyMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "organizerCurrency";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "organizer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "currencyMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "treasuryCurrency";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "treasury";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "currencyMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "buyResale";
      discriminator: [71, 230, 159, 123, 90, 231, 111, 104];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "buyer";
          signer: true;
        },
        {
          name: "config";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 110, 102, 105, 103];
              },
            ];
          };
        },
        {
          name: "event";
          writable: true;
          relations: ["listing"];
        },
        {
          name: "ticketMint";
        },
        {
          name: "currencyMint";
          relations: ["config"];
        },
        {
          name: "seller";
          relations: ["listing"];
        },
        {
          name: "organizer";
          relations: ["event"];
        },
        {
          name: "treasury";
          relations: ["config"];
        },
        {
          name: "listing";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 115, 116, 105, 110, 103];
              },
              {
                kind: "account";
                path: "event";
              },
              {
                kind: "account";
                path: "seller";
              },
              {
                kind: "account";
                path: "listing.nonce";
                account: "listing";
              },
            ];
          };
        },
        {
          name: "escrow";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "listing";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
          relations: ["listing"];
        },
        {
          name: "rentPayer";
          writable: true;
          relations: ["listing"];
        },
        {
          name: "buyerTicket";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "buyer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "buyerCurrency";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "buyer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "currencyMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "sellerCurrency";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "seller";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "currencyMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "organizerCurrency";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "organizer";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "currencyMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "treasuryCurrency";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "treasury";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "currencyMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "extraAccountMetaList";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115,
                ];
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                111,
                160,
                182,
                41,
                55,
                237,
                143,
                233,
                172,
                232,
                117,
                63,
                173,
                144,
                40,
                240,
                178,
                50,
                81,
                19,
                247,
                242,
                42,
                83,
                0,
                91,
                165,
                172,
                109,
                191,
                114,
                102,
              ];
            };
          };
        },
        {
          name: "hookProgram";
          address: "8WkPYAkswnyywHpY7VcCwVMsCgmDzMrDtLuT9ZzGyoWD";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "cancel";
      discriminator: [232, 219, 223, 41, 219, 236, 220, 190];
      accounts: [
        {
          name: "seller";
          signer: true;
          relations: ["listing"];
        },
        {
          name: "event";
          relations: ["listing"];
        },
        {
          name: "ticketMint";
        },
        {
          name: "listing";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 115, 116, 105, 110, 103];
              },
              {
                kind: "account";
                path: "event";
              },
              {
                kind: "account";
                path: "seller";
              },
              {
                kind: "account";
                path: "listing.nonce";
                account: "listing";
              },
            ];
          };
        },
        {
          name: "escrow";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "listing";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
          relations: ["listing"];
        },
        {
          name: "sellerTicket";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "seller";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "rentPayer";
          writable: true;
          relations: ["listing"];
        },
        {
          name: "extraAccountMetaList";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115,
                ];
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                111,
                160,
                182,
                41,
                55,
                237,
                143,
                233,
                172,
                232,
                117,
                63,
                173,
                144,
                40,
                240,
                178,
                50,
                81,
                19,
                247,
                242,
                42,
                83,
                0,
                91,
                165,
                172,
                109,
                191,
                114,
                102,
              ];
            };
          };
        },
        {
          name: "hookProgram";
          address: "8WkPYAkswnyywHpY7VcCwVMsCgmDzMrDtLuT9ZzGyoWD";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
      ];
      args: [];
    },
    {
      name: "createEvent";
      discriminator: [49, 219, 29, 203, 22, 98, 100, 87];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "organizer";
          signer: true;
        },
        {
          name: "event";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [101, 118, 101, 110, 116];
              },
              {
                kind: "account";
                path: "organizer";
              },
              {
                kind: "arg";
                path: "eventId";
              },
            ];
          };
        },
        {
          name: "ticketMint";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 105, 110, 116];
              },
              {
                kind: "account";
                path: "event";
              },
            ];
          };
        },
        {
          name: "extraAccountMetaList";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115,
                ];
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                111,
                160,
                182,
                41,
                55,
                237,
                143,
                233,
                172,
                232,
                117,
                63,
                173,
                144,
                40,
                240,
                178,
                50,
                81,
                19,
                247,
                242,
                42,
                83,
                0,
                91,
                165,
                172,
                109,
                191,
                114,
                102,
              ];
            };
          };
        },
        {
          name: "hookProgram";
          address: "8WkPYAkswnyywHpY7VcCwVMsCgmDzMrDtLuT9ZzGyoWD";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "eventId";
          type: "u64";
        },
        {
          name: "name";
          type: "string";
        },
        {
          name: "venue";
          type: "string";
        },
        {
          name: "date";
          type: "i64";
        },
        {
          name: "facePrice";
          type: "u64";
        },
        {
          name: "supply";
          type: "u32";
        },
        {
          name: "capBps";
          type: "u16";
        },
        {
          name: "royaltyBps";
          type: "u16";
        },
        {
          name: "uri";
          type: "string";
        },
      ];
    },
    {
      name: "initializeConfig";
      discriminator: [208, 127, 21, 1, 194, 190, 196, 70];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
          address: "5coagnKL9pD4mfn4RL1KtWfMZ6jTmBTubQ2G7kUNhJud";
        },
        {
          name: "config";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 110, 102, 105, 103];
              },
            ];
          };
        },
        {
          name: "currencyMint";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "list";
      discriminator: [54, 174, 193, 67, 17, 41, 132, 38];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "seller";
          signer: true;
        },
        {
          name: "event";
        },
        {
          name: "ticketMint";
        },
        {
          name: "listing";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 115, 116, 105, 110, 103];
              },
              {
                kind: "account";
                path: "event";
              },
              {
                kind: "account";
                path: "seller";
              },
              {
                kind: "arg";
                path: "nonce";
              },
            ];
          };
        },
        {
          name: "escrow";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "listing";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "sellerTicket";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "seller";
              },
              {
                kind: "account";
                path: "tokenProgram";
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: "extraAccountMetaList";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115,
                ];
              },
              {
                kind: "account";
                path: "ticketMint";
              },
            ];
            program: {
              kind: "const";
              value: [
                111,
                160,
                182,
                41,
                55,
                237,
                143,
                233,
                172,
                232,
                117,
                63,
                173,
                144,
                40,
                240,
                178,
                50,
                81,
                19,
                247,
                242,
                42,
                83,
                0,
                91,
                165,
                172,
                109,
                191,
                114,
                102,
              ];
            };
          };
        },
        {
          name: "hookProgram";
          address: "8WkPYAkswnyywHpY7VcCwVMsCgmDzMrDtLuT9ZzGyoWD";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "nonce";
          type: "u64";
        },
        {
          name: "price";
          type: "u64";
        },
      ];
    },
  ];
  accounts: [
    {
      name: "config";
      discriminator: [155, 12, 170, 224, 30, 250, 204, 130];
    },
    {
      name: "event";
      discriminator: [125, 192, 125, 158, 9, 115, 152, 233];
    },
    {
      name: "listing";
      discriminator: [218, 32, 50, 73, 43, 134, 26, 58];
    },
  ];
  errors: [
    {
      code: 6000;
      name: "unauthorized";
      msg: "Only the configured administrator may initialize the market.";
    },
    {
      code: 6001;
      name: "invalidCurrency";
      msg: "Test credits must use two decimal places.";
    },
    {
      code: 6002;
      name: "invalidDetails";
      msg: "Check the event details, date, ticket quantity and face price.";
    },
    {
      code: 6003;
      name: "invalidCap";
      msg: "The resale cap must be between 0% and 25%.";
    },
    {
      code: 6004;
      name: "invalidRoyalty";
      msg: "The organizer royalty must be between 0% and 10%.";
    },
    {
      code: 6005;
      name: "soldOut";
      msg: "This event is sold out.";
    },
    {
      code: 6006;
      name: "overCap";
      msg: "The asking price exceeds the organizer's resale cap.";
    },
    {
      code: 6007;
      name: "arithmetic";
      msg: "The amount is outside the supported range.";
    },
  ];
  types: [
    {
      name: "config";
      type: {
        kind: "struct";
        fields: [
          {
            name: "currencyMint";
            type: "pubkey";
          },
          {
            name: "treasury";
            type: "pubkey";
          },
          {
            name: "primaryFeeBps";
            type: "u16";
          },
          {
            name: "resaleFeeBps";
            type: "u16";
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "event";
      type: {
        kind: "struct";
        fields: [
          {
            name: "organizer";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "eventId";
            type: "u64";
          },
          {
            name: "facePrice";
            type: "u64";
          },
          {
            name: "capBps";
            type: "u16";
          },
          {
            name: "royaltyBps";
            type: "u16";
          },
          {
            name: "supply";
            type: "u32";
          },
          {
            name: "sold";
            type: "u32";
          },
          {
            name: "resales";
            type: "u32";
          },
          {
            name: "royaltiesEarned";
            type: "u64";
          },
          {
            name: "date";
            type: "i64";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "venue";
            type: "string";
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "listing";
      type: {
        kind: "struct";
        fields: [
          {
            name: "event";
            type: "pubkey";
          },
          {
            name: "seller";
            type: "pubkey";
          },
          {
            name: "escrow";
            type: "pubkey";
          },
          {
            name: "rentPayer";
            type: "pubkey";
          },
          {
            name: "nonce";
            type: "u64";
          },
          {
            name: "price";
            type: "u64";
          },
          {
            name: "createdAt";
            type: "i64";
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
  ];
};
