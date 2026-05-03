// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * ██████╗  ██████╗ ██╗   ██╗██╗  ██╗ █████╗
 * ██╔══██╗██╔═══██╗╚██╗ ██╔╝██║  ██║██╔══██╗
 * ██████╔╝██║   ██║ ╚████╔╝ ███████║███████║
 * ██╔═══╝ ██║   ██║  ╚██╔╝  ██╔══██║██╔══██║
 * ██║     ╚██████╔╝   ██║   ██║  ██║██║  ██║
 * ╚═╝      ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
 *
 * PDuka Token — Official ERC-20 Token of the PayDuka Ecosystem
 * Built on Polygon (EVM Compatible)
 *
 * Website  : https://payduka.xyz
 * Ecosystem: Retail Blockchain Payments — Southern Africa
 *
 * Token Details:
 * - Name        : PDuka Token
 * - Symbol      : PDUKA
 * - Total Supply: 21,000,000,000 (21 Billion) — Fixed, No Additional Minting
 * - Decimals    : 18
 * - Network     : Polygon Mainnet / Mumbai Testnet
 * - Standard    : ERC-20 with Deflationary Burn Mechanism
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PDukaToken is ERC20, ERC20Burnable, ERC20Permit, Ownable, ReentrancyGuard {

    // ─────────────────────────────────────────────────────────────
    // CONSTANTS
    // ─────────────────────────────────────────────────────────────

    /// @notice Total fixed supply — 21 Billion PDuka (no additional minting ever)
    uint256 public constant MAX_SUPPLY = 21_000_000_000 * 10 ** 18;

    /// @notice Burn rate on every transfer — 0.1% (10 basis points)
    uint256 public constant BURN_RATE_BPS = 10; // 10 / 10000 = 0.1%

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ─────────────────────────────────────────────────────────────
    // TOKEN ALLOCATION — Matches PayDuka Whitepaper v1.0
    // ─────────────────────────────────────────────────────────────

    /// @notice Ecosystem Growth & Rewards     — 40% (8.4B PDuka)
    uint256 public constant ECOSYSTEM_ALLOCATION   = 8_400_000_000 * 10 ** 18;

    /// @notice Staking Rewards Reserve        — 20% (4.2B PDuka)
    uint256 public constant STAKING_ALLOCATION     = 4_200_000_000 * 10 ** 18;

    /// @notice Protocol Development           — 15% (3.15B PDuka)
    uint256 public constant DEVELOPMENT_ALLOCATION = 3_150_000_000 * 10 ** 18;

    /// @notice Liquidity Provision            — 15% (3.15B PDuka)
    uint256 public constant LIQUIDITY_ALLOCATION   = 3_150_000_000 * 10 ** 18;

    /// @notice Team & Advisors                — 10% (2.1B PDuka)
    uint256 public constant TEAM_ALLOCATION        = 2_100_000_000 * 10 ** 18;

    // ─────────────────────────────────────────────────────────────
    // WALLET ADDRESSES — PayDuka Ecosystem
    // ─────────────────────────────────────────────────────────────

    /// @notice Ecosystem Growth & Rewards wallet — 40% (8.4B PDuka)
    address public constant ECOSYSTEM_WALLET   = 0x81f2744be3c6630E088E58639A6991a30d388587;

    /// @notice Staking Rewards Reserve wallet — 20% (4.2B PDuka)
    address public constant STAKING_WALLET     = 0x5dF03Dab7cDf2D8f4DB8C45F1bDDEa294844088D;

    /// @notice Protocol Development wallet — 15% (3.15B PDuka)
    address public constant DEVELOPMENT_WALLET = 0xecF2CA6C0a1e75f1B1A3127922796e393A0f132F;

    /// @notice Liquidity Provision wallet — 15% (3.15B PDuka)
    address public constant LIQUIDITY_WALLET   = 0x0Cf905ed523851a9AbB0f73728544029c624Ad0e;

    // ─────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────

    /// @notice Total amount of PDuka burned to date
    uint256 public totalBurned;

    /// @notice Addresses exempt from burn on transfer (e.g. staking contract, liquidity pools)
    mapping(address => bool) public isBurnExempt;

    /// @notice Team vesting — tracks team token release
    mapping(address => uint256) public teamVestingBalance;
    mapping(address => uint256) public teamVestingStart;
    mapping(address => uint256) public teamVestingClaimed;

    // ─────────────────────────────────────────────────────────────
    // VESTING CONSTANTS — Team & Advisors
    // ─────────────────────────────────────────────────────────────

    /// @notice 6 month cliff before any team tokens unlock
    uint256 public constant VESTING_CLIFF     = 180 days;

    /// @notice 24 month linear vesting after cliff
    uint256 public constant VESTING_DURATION  = 720 days;

    // ─────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────

    event TokensBurned(address indexed from, uint256 amount);
    event BurnExemptSet(address indexed account, bool exempt);
    event TeamVestingAssigned(address indexed beneficiary, uint256 amount);
    event TeamTokensClaimed(address indexed beneficiary, uint256 amount);
    event EcosystemTokensDistributed(address indexed recipient, uint256 amount);

    // ─────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Deploy PDuka Token and distribute allocations to hardcoded wallets
     * @dev No constructor arguments needed — all wallets are hardcoded above
     *      Deployer (msg.sender) receives Team allocation (2.1B PDuka)
     */
    constructor()
        ERC20("PDuka Token", "PDUKA")
        ERC20Permit("PDuka Token")
        Ownable(msg.sender)
    {
        // Mint ecosystem allocation → ECOSYSTEM_WALLET (8.4B)
        _mint(ECOSYSTEM_WALLET, ECOSYSTEM_ALLOCATION);

        // Mint staking allocation → STAKING_WALLET (4.2B)
        _mint(STAKING_WALLET, STAKING_ALLOCATION);

        // Mint development allocation → DEVELOPMENT_WALLET (3.15B)
        _mint(DEVELOPMENT_WALLET, DEVELOPMENT_ALLOCATION);

        // Mint liquidity allocation → LIQUIDITY_WALLET (3.15B)
        _mint(LIQUIDITY_WALLET, LIQUIDITY_ALLOCATION);

        // Team allocation (2.1B) → deployer (msg.sender), assigned via assignTeamVesting()
        _mint(msg.sender, TEAM_ALLOCATION);

        // Exempt key wallets from burn
        isBurnExempt[ECOSYSTEM_WALLET]   = true;
        isBurnExempt[STAKING_WALLET]     = true;
        isBurnExempt[DEVELOPMENT_WALLET] = true;
        isBurnExempt[LIQUIDITY_WALLET]   = true;
        isBurnExempt[msg.sender]         = true;
    }

    // ─────────────────────────────────────────────────────────────
    // DEFLATIONARY BURN MECHANISM
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Override transfer to apply 0.1% burn on every transaction
     * @dev Burn exempt addresses (staking, liquidity) are excluded
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Apply burn only on regular transfers (not mint/burn operations)
        if (
            from != address(0) &&
            to != address(0) &&
            !isBurnExempt[from] &&
            !isBurnExempt[to]
        ) {
            uint256 burnAmount = (amount * BURN_RATE_BPS) / BPS_DENOMINATOR;

            if (burnAmount > 0) {
                totalBurned += burnAmount;
                super._update(from, address(0), burnAmount); // burn
                emit TokensBurned(from, burnAmount);
                amount -= burnAmount;
            }
        }

        super._update(from, to, amount);
    }

    // ─────────────────────────────────────────────────────────────
    // TEAM VESTING
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Assign vesting schedule to a team member or advisor
     * @param beneficiary Address of team member
     * @param amount      Amount of PDuka to vest
     */
    function assignTeamVesting(
        address beneficiary,
        uint256 amount
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");
        require(
            balanceOf(msg.sender) >= amount,
            "Insufficient team allocation balance"
        );

        teamVestingBalance[beneficiary] = amount;
        teamVestingStart[beneficiary]   = block.timestamp;
        teamVestingClaimed[beneficiary] = 0;

        // Transfer tokens to contract to hold during vesting
        _transfer(msg.sender, address(this), amount);

        emit TeamVestingAssigned(beneficiary, amount);
    }

    /**
     * @notice Claim vested team tokens
     * @dev 6 month cliff, then linear vesting over 24 months
     */
    function claimVestedTokens() external nonReentrant {
        uint256 claimable = getClaimableAmount(msg.sender);
        require(claimable > 0, "No tokens available to claim");

        teamVestingClaimed[msg.sender] += claimable;
        _transfer(address(this), msg.sender, claimable);

        emit TeamTokensClaimed(msg.sender, claimable);
    }

    /**
     * @notice Calculate how many tokens a beneficiary can claim right now
     * @param beneficiary Address to check
     */
    function getClaimableAmount(address beneficiary) public view returns (uint256) {
        uint256 vestingStart   = teamVestingStart[beneficiary];
        uint256 totalAllocated = teamVestingBalance[beneficiary];
        uint256 alreadyClaimed = teamVestingClaimed[beneficiary];

        if (totalAllocated == 0) return 0;
        if (block.timestamp < vestingStart + VESTING_CLIFF) return 0;

        uint256 elapsed = block.timestamp - (vestingStart + VESTING_CLIFF);
        if (elapsed > VESTING_DURATION) elapsed = VESTING_DURATION;

        uint256 vested = (totalAllocated * elapsed) / VESTING_DURATION;
        if (vested <= alreadyClaimed) return 0;

        return vested - alreadyClaimed;
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Set burn exemption for an address (e.g. staking contract, DEX pools)
     * @param account Address to exempt or un-exempt
     * @param exempt  True to exempt, false to remove exemption
     */
    function setBurnExempt(address account, bool exempt) external onlyOwner {
        isBurnExempt[account] = exempt;
        emit BurnExemptSet(account, exempt);
    }

    // ─────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────

    /// @notice Returns circulating supply (total minted minus burned)
    function circulatingSupply() external view returns (uint256) {
        return totalSupply() - balanceOf(address(this));
    }

    /// @notice Returns total PDuka burned to date
    function getTotalBurned() external view returns (uint256) {
        return totalBurned;
    }

    /// @notice Returns remaining supply cap
    function remainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}
