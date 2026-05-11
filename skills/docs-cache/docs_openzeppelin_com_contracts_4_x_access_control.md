Access Control | OpenZeppelin Docs

Join our community of builders on  Telegram!  Telegram

OpenZeppelin Logo

Select Ecosystem

Ethereum Icon

Ethereum & EVM

Home

Forum

Website

Impact  Getting Started  Solidity Contracts

OpenZeppelin Contracts

Overview  Contracts Wizard  Extending Contracts  Using with Upgrades  Backwards Compatibility  Access Control

Account Abstraction

Tokens

Governance  Utilities

Subgraphs

FAQ  Changelog

API Reference

Previous Versions

v4

Overview  Extending Contracts  Using with Upgrades  Releases & Stability  Access Control

Tokens

Crosschain  Governance  Utilities  Drafts  Crowdsales (Legacy)

API Reference

v3

Community Contracts

Upgrades Plugins

Contracts Wizard

Learn

Developer Libraries

Ecosystem Adapters

UIKit

Open Source Tools

Relayer

Monitor

UI Builder

Role Manager

Defender

GitHub Icon

OpenZeppelin Contracts

Previous Versions

v4

Access Control

Outdated Version  You&#x27;re viewing an older version (v 4.x ) The latest documentation is available for the current version. Click here to visit latest version.

Copy Markdown

Anthropic

Open in Claude

Access control—that is, "who is allowed to do this thing"—is incredibly important in the world of smart contracts. The access control of your contract may govern who can mint tokens, vote on proposals, freeze transfers, and many other things. It is therefore  critical  to understand how you implement it, lest someone else  steals your whole system .

Ownership and  Ownable

The most common and basic form of access control is the concept of  ownership : there’s an account that is the  owner  of a contract and can do administrative tasks on it. This approach is perfectly reasonable for contracts that have a single administrative user.

OpenZeppelin Contracts provides

Ownable

for implementing ownership in your contracts.

// contracts/MyContract.sol

// SPDX-License-Identifier: MIT

pragma

solidity

^0.8.0  ;

import

"@openzeppelin/contracts/access/Ownable.sol"  ;

contract

MyContract

is

Ownable

function

normalThing  ()

public

{

// anyone can call this normalThing()

function

specialThing  ()

public

onlyOwner

//

only

the

owner

can

call

specialThing  ()!

}

By default, the

owner

of an  Ownable  contract is the account that deployed it, which is usually exactly what you want.

Ownable also lets you:

transferOwnership

from the owner account to a new one, and

renounceOwnership

for the owner to relinquish this administrative privilege, a common pattern after an initial stage with centralized administration is over.

Removing the owner altogether will mean that administrative tasks that are protected by  onlyOwner  will no longer be callable!

Note that  a contract can also be the owner of another one ! This opens the door to using, for example, a  Gnosis Safe , an  Aragon DAO , or a totally custom contract that  you  create.

In this way, you can use  composability  to add additional layers of access control complexity to your contracts. Instead of having a single regular Ethereum account (Externally Owned Account, or EOA) as the owner, you could use a 2-of-3 multisig run by your project leads, for example. Prominent projects in the space, such as  MakerDAO , use systems similar to this one.

Role-Based Access Control

While the simplicity of  ownership  can be useful for simple systems or quick prototyping, different levels of authorization are often needed. You may want for an account to have permission to ban users from a system, but not create new tokens.

Role-Based Access Control (RBAC)

offers flexibility in this regard.

In essence, we will be defining multiple  roles , each allowed to perform different sets of actions. An account may have, for example, &#x27;moderator&#x27;, &#x27;minter&#x27; or &#x27;admin&#x27; roles, which you will then check for instead of simply using  onlyOwner . This check can be enforced through the  onlyRole  modifier. Separately, you will be able to define rules for how accounts can be granted a role, have it revoked, and more.

Most software uses access control systems that are role-based: some users are regular users, some may be supervisors or managers, and a few will often have administrative privileges.

Using  AccessControl

OpenZeppelin Contracts provides

AccessControl

for implementing role-based access control. Its usage is straightforward: for each role that you want to define,
you will create a new  role identifier  that is used to grant, revoke, and check if an account has that role.

Here’s a simple example of using  AccessControl  in an

ERC20  token  to define a &#x27;minter&#x27; role, which allows accounts that have it create new tokens:

// contracts/MyToken.sol

// SPDX-License-Identifier: MIT

pragma

solidity

^0.8.0  ;

import

"@openzeppelin/contracts/access/AccessControl.sol"  ;

import

"@openzeppelin/contracts/token/ERC20/ERC20.sol"  ;

contract

MyToken

is

ERC20  ,

AccessControl

//

Create

a

new

role

identifier

for

the

minter

role

bytes32

public

constant

MINTER_ROLE

=

keccak256  ("  MINTER_ROLE  ");

constructor  (  address

minter  )

ERC20  ("  MyToken  ", "  TKN  ") {

// Grant the minter role to a specified account

_grantRole  (MINTER_ROLE, minter);

function

mint  (  address

to  ,

uint256

amount  )

public

//

Check

that

the

calling

account

has

the

minter

role

require  (  hasRole  (  MINTER_ROLE  ,

msg.sender  ), "  Caller

is

not

a

minter  ");

_mint  (to, amount);

}

Make sure you fully understand how

AccessControl

works before using it on your system, or copy-pasting the examples from this guide.

While clear and explicit, this isn’t anything we wouldn’t have been able to achieve with  Ownable . Indeed, where  AccessControl  shines is in scenarios where granular permissions are required, which can be implemented by defining  multiple  roles.

Let’s augment our ERC20 token example by also defining a &#x27;burner&#x27; role, which lets accounts destroy tokens, and by using the  onlyRole  modifier:

// contracts/MyToken.sol

// SPDX-License-Identifier: MIT

pragma

solidity

^0.8.0  ;

import

"@openzeppelin/contracts/access/AccessControl.sol"  ;

import

"@openzeppelin/contracts/token/ERC20/ERC20.sol"  ;

contract

MyToken

is

ERC20  ,

AccessControl

bytes32

public

constant

MINTER_ROLE

=

keccak256  ("  MINTER_ROLE  ");

bytes32

public

constant

BURNER_ROLE

=

keccak256  ("  BURNER_ROLE  ");

constructor  (  address

minter  ,

address

burner  )

ERC20  ("  MyToken  ", "  TKN  ") {

_grantRole  (MINTER_ROLE, minter);

_grantRole  (BURNER_ROLE, burner);

function

mint  (  address

to  ,

uint256

amount  )

public

onlyRole  (  MINTER_ROLE  )

_mint  (  to  ,

amount  );

function

burn  (  address

from  ,

uint256

amount  )

public

onlyRole  (  BURNER_ROLE  )

_burn  (  from  ,

amount  );

}

So clean! By splitting concerns this way, more granular levels of permission may be implemented than were possible with the simpler  ownership  approach to access control. Limiting what each component of a system is able to do is known as the  principle of least privilege , and is a good security practice. Note that each account may still have more than one role, if so desired.

Granting and Revoking Roles

The ERC20 token example above uses  _grantRole , an  internal  function that is useful when programmatically assigning roles (such as during construction). But what if we later want to grant the &#x27;minter&#x27; role to additional accounts?

By default,

accounts with a role cannot grant it or revoke it from other accounts  : all having a role does is making the  hasRole  check pass. To grant and revoke roles dynamically, you will need help from the  role’s admin .

Every role has an associated admin role, which grants permission to call the  grantRole  and  revokeRole  functions. A role can be granted or revoked by using these if the calling account has the corresponding admin role. Multiple roles may hav