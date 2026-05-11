Security Considerations &mdash; Solidity 0.8.36-develop documentation

Security Considerations

Edit on GitHub

Security Considerations 

While it is usually quite easy to build software that works as expected,
it is much harder to check that nobody can use it in a way that was  not  anticipated.

In Solidity, this is even more important because you can use smart contracts to handle tokens or,
possibly, even more valuable things.
Furthermore, every execution of a smart contract happens in public and,
in addition to that, the source code is often available.

Of course, you always have to consider how much is at stake:
You can compare a smart contract with a web service that is open to the public
(and thus, also to malicious actors) and perhaps even open-source.
If you only store your grocery list on that web service, you might not have to take too much care,
but if you manage your bank account using that web service, you should be more careful.

This section will list some pitfalls and general security recommendations
but can, of course, never be complete.
Also, keep in mind that even if your smart contract code is bug-free,
the compiler or the platform itself might have a bug.
A list of some publicly known security-relevant bugs of the compiler can be found
in the

list of known bugs  , which is also machine-readable.
Note that there is a  Bug Bounty Program 
that covers the code generator of the Solidity compiler.

As always, with open-source documentation,
please help us extend this section (especially, some examples would not hurt)!

NOTE: In addition to the list below, you can find more security recommendations and best practices
 in Guy Lando’s knowledge list  and
 the Consensys GitHub repo .

Pitfalls 

Private Information and Randomness 

Everything you use in a smart contract is publicly visible,
even local variables and state variables marked

private  .

Using random numbers in smart contracts is quite tricky if you do not want block builders to be able to cheat.

Reentrancy 

Any interaction from a contract (A) with another contract (B)
and any transfer of Ether hands over control to that contract (B).
This makes it possible for B to call back into A before this interaction is completed.
To give an example, the following code contains a bug (it is just a snippet and not a complete contract):

open in Remix

// SPDX-License-Identifier: GPL-3.0

pragma solidity

>=  0.6.0

<  0.9.0  ;

// THIS CONTRACT CONTAINS A BUG - DO NOT USE

contract

Fund

{

/// @dev Mapping of ether shares of the contract.

mapping  (  address

=>

uint  )

shares ;

/// Withdraw your share.

function

withdraw  ()

public

{

// This will report a warning (deprecation)

if

(  payable  (  msg.sender  ). send ( shares [  msg.sender  ]))

shares [  msg.sender  ]

=

0  ;

}

}

The problem is not too serious here because of the limited gas as part of

send  ,
but it still exposes a weakness:
Ether transfer can always include code execution,
so the recipient could be a contract that calls back into

withdraw  .
This would let it get multiple refunds and, basically, retrieve all the Ether in the contract.
In particular, the following contract will allow an attacker to refund multiple times
as it uses

call

which does not limit the amount of gas that is forwarded by default:

open in Remix

// SPDX-License-Identifier: GPL-3.0

pragma solidity

>=  0.6.2

<  0.9.0  ;

// THIS CONTRACT CONTAINS A BUG - DO NOT USE

contract

Fund

{

/// @dev Mapping of ether shares of the contract.

mapping  (  address

=>

uint  )

shares ;

/// Withdraw your share.

function

withdraw  ()

public

{

(  bool

success  ,)

=

msg.sender  . call { value :

shares [  msg.sender  ]}(  ""  );

if

( success )

shares [  msg.sender  ]

=

0  ;

}

}

To avoid reentrancy, you can use the Checks-Effects-Interactions pattern as demonstrated below:

open in Remix

// SPDX-License-Identifier: GPL-3.0

pragma solidity

>=  0.6.2

<  0.9.0  ;

contract

Fund

{

/// @dev Mapping of ether shares of the contract.

mapping  (  address

=>

uint  )

shares ;

/// Withdraw your share.

function

withdraw  ()

public

{

uint

share

=

shares [  msg.sender  ];

shares [  msg.sender  ]

=

0  ;

(  bool

success  ,

)

=

payable  (  msg.sender  ). call { value :

share }(  ""  );

require  ( success );

}

}

The Checks-Effects-Interactions pattern ensures that all code paths through a contract
complete all required checks of the supplied parameters before modifying the contract’s state (Checks);
only then it makes any changes to the state (Effects);
it may make calls to functions in other contracts
 after  all planned state changes have been written to storage (Interactions).
This is a common foolproof way to prevent  reentrancy attacks ,
where an externally called malicious contract can double-spend an allowance,
double-withdraw a balance, among other things,
by using logic that calls back into the original contract before it has finalized its transaction.

Note that reentrancy is not only an effect of Ether transfer
but of any function call on another contract.
Furthermore, you also have to take multi-contract situations into account.
A called contract could modify the state of another contract you depend on.

Gas Limit and Loops 

Loops that do not have a fixed number of iterations, for example,
loops that depend on storage values, have to be used carefully:
Due to the block gas limit, transactions can only consume a certain amount of gas.
Either explicitly or just due to normal operation,
the number of iterations in a loop can grow beyond the block gas limit
which can cause the complete contract to be stalled at a certain point.
This may not apply to

view

functions that are only executed to read data from the blockchain.
Still, such functions may be called by other contracts as part of on-chain operations and stall those.
Please be explicit about such cases in the documentation of your contracts.

Sending and Receiving Ether 

Neither contracts nor “externally-owned accounts” are currently able to prevent someone from sending them Ether.
Contracts can react on and reject a regular transfer, but there are ways to move Ether without creating a message call.
One way is to simply “mine to” the contract address and the second way is using

selfdestruct(x)  .

If a contract receives Ether (without a function being called), either the

receive Ether

or the

fallback

function is executed.
If it does not have a

receive

nor a

fallback

function, the Ether will be rejected (by throwing an exception).
During the execution of one of these functions, the contract can only rely on the “gas stipend” it is passed (2300 gas)
being available to it at that time.
This stipend is not enough to modify storage (do not take this for granted though, the stipend might change with future hard forks).
To be sure that your contract can receive Ether in that way, check the gas requirements of the receive and fallback functions
(for example in the “details” section in Remix).

There is a way to forward more gas to the receiving contract using

addr.call{value:

x}("")  .
This is essentially the same as

addr.transfer(x)  , only that it forwards all remaining gas,
subject to additional limits imposed by some EVM versions (such as the  63/64th rule 
introduced by

tangerineWhistle  ), and opens up the ability for the recipient to perform more expensive actions
(and it returns a failure code instead of automatically propagating the error).
This might include calling back into the sending contract or other state changes you might not have thought of.
So it allows for great flexibility for honest users but also for malicious actors.

Use the most precise units to represent the Wei amount as possible, as you lose any that is rounded due to a lack of precision.

If you want to send Ether using

address.transfer  , there are certain details to be aware of:

If the recipient is a contract, it causes its receive or fallback 