// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title PDukaICO
 * @notice PayDuka ICO Contract — Accepts USDC and POL
 * @dev Flat price: $0.005 per PDuka | Allocation: 1 Billion PDuka
 * @dev POL/USD price via Chainlink oracle — Polygon Mainnet
 */
contract PDukaICO is Ownable, ReentrancyGuard {

    // ─── Tokens ───────────────────────────────────────────────
    IERC20 public pduka;
    IERC20 public usdc;

    // ─── Chainlink Price Feed ─────────────────────────────────
    // POL/USD on Polygon Mainnet
    AggregatorV3Interface public priceFeed;
    address public constant POL_USD_FEED = 0xAB594600376Ec9fD91F8e885dADF0CE036862dE0;

    // ─── Config ───────────────────────────────────────────────
    // PDuka price: $0.005
    // In USDC (6 decimals): 5000 = 0.005 USDC
    uint256 public constant PDUKA_PRICE_USD = 5000; // $0.005 in USDC 6-decimal units

    // ICO allocation: 1 Billion PDuka
    uint256 public constant ICO_ALLOCATION = 1_000_000_000 * 10 ** 18;

    // Funds receiver — PayDuka owner wallet
    address public constant FUNDS_WALLET = 0xDAe4743b26BfA6Cbe696E75B189b13A93bD36546;

    // USDC on Polygon Mainnet
    address public constant USDC_ADDRESS = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;

    // ─── State ────────────────────────────────────────────────
    bool public icoActive = false;
    uint256 public totalSold = 0;

    // ─── Events ───────────────────────────────────────────────
    event TokensPurchasedUSDC(address indexed buyer, uint256 usdcAmount, uint256 pdukaAmount);
    event TokensPurchasedPOL(address indexed buyer, uint256 polAmount, uint256 pdukaAmount);
    event ICOStarted();
    event ICOEnded();

    constructor(address _pdukaToken) Ownable(msg.sender) {
        pduka = IERC20(_pdukaToken);
        usdc = IERC20(USDC_ADDRESS);
        priceFeed = AggregatorV3Interface(POL_USD_FEED);
    }

    // ─── Modifiers ────────────────────────────────────────────
    modifier whenICOActive() {
        require(icoActive, "ICO is not active");
        _;
    }

    // ─── Chainlink: Get Live POL Price ────────────────────────
    /**
     * @notice Returns live POL price in USD with 8 decimals
     * @dev e.g. $0.50 = 50_000_000 | $1.00 = 100_000_000
     */
    function getPolPrice() public view returns (uint256) {
        (
            ,
            int256 price,
            ,
            uint256 updatedAt,
        ) = priceFeed.latestRoundData();

        require(price > 0, "Invalid price feed");
        require(block.timestamp - updatedAt < 3600, "Price feed stale"); // max 1hr old

        return uint256(price); // 8 decimals
    }

    // ─── Buy with USDC ────────────────────────────────────────
    /**
     * @notice Buy PDuka with USDC
     * @param usdcAmount Amount of USDC (6 decimals, e.g. 10 USDC = 10_000_000)
     */
    function buyWithUSDC(uint256 usdcAmount) external nonReentrant whenICOActive {
        require(usdcAmount > 0, "Amount must be greater than 0");

        // PDuka amount = usdcAmount / 0.005 USDC
        uint256 pdukaAmount = (usdcAmount * 10 ** 18) / PDUKA_PRICE_USD;

        require(pdukaAmount > 0, "PDuka amount too small");
        require(totalSold + pdukaAmount <= ICO_ALLOCATION, "Exceeds ICO allocation");
        require(pduka.balanceOf(address(this)) >= pdukaAmount, "Insufficient ICO balance");

        // Pull USDC from buyer → send to funds wallet
        require(usdc.transferFrom(msg.sender, FUNDS_WALLET, usdcAmount), "USDC transfer failed");

        // Send PDuka to buyer
        require(pduka.transfer(msg.sender, pdukaAmount), "PDuka transfer failed");

        totalSold += pdukaAmount;

        emit TokensPurchasedUSDC(msg.sender, usdcAmount, pdukaAmount);
    }

    // ─── Buy with POL ─────────────────────────────────────────
    /**
     * @notice Buy PDuka with POL using live Chainlink price
     * @dev Send POL as msg.value
     */
    function buyWithPOL() external payable nonReentrant whenICOActive {
        require(msg.value > 0, "Must send POL");

        // Get live POL price (8 decimals)
        uint256 polPrice = getPolPrice(); // e.g. 50_000_000 = $0.50

        // PDuka price in 8 decimals = $0.005 * 10^8 = 500_000
        uint256 PDUKA_PRICE_8DEC = 500_000;

        // pdukaAmount (18 decimals) = msg.value(18) * polPrice(8) / PDUKA_PRICE_8DEC(8)
        uint256 pdukaAmount = (msg.value * polPrice) / PDUKA_PRICE_8DEC;

        require(pdukaAmount > 0, "PDuka amount too small");
        require(totalSold + pdukaAmount <= ICO_ALLOCATION, "Exceeds ICO allocation");
        require(pduka.balanceOf(address(this)) >= pdukaAmount, "Insufficient ICO balance");

        // Forward POL to funds wallet
        (bool sent, ) = FUNDS_WALLET.call{value: msg.value}("");
        require(sent, "POL transfer failed");

        // Send PDuka to buyer
        require(pduka.transfer(msg.sender, pdukaAmount), "PDuka transfer failed");

        totalSold += pdukaAmount;

        emit TokensPurchasedPOL(msg.sender, msg.value, pdukaAmount);
    }

    // ─── Owner Functions ──────────────────────────────────────

    function startICO() external onlyOwner {
        icoActive = true;
        emit ICOStarted();
    }

    function endICO() external onlyOwner {
        icoActive = false;
        emit ICOEnded();
    }

    /**
     * @notice Withdraw unsold PDuka after ICO ends
     */
    function withdrawUnsoldTokens() external onlyOwner {
        require(!icoActive, "End ICO first");
        uint256 remaining = pduka.balanceOf(address(this));
        require(remaining > 0, "Nothing to withdraw");
        pduka.transfer(FUNDS_WALLET, remaining);
    }

    // ─── View Functions ───────────────────────────────────────

    function remainingAllocation() external view returns (uint256) {
        return ICO_ALLOCATION - totalSold;
    }

    function icoBalance() external view returns (uint256) {
        return pduka.balanceOf(address(this));
    }

    /**
     * @notice Preview how much PDuka you get for X POL (in wei)
     */
    function previewPOLPurchase(uint256 polAmount) external view returns (uint256 pdukaAmount) {
        uint256 polPrice = getPolPrice();
        pdukaAmount = (polAmount * polPrice) / 500_000;
    }

    /**
     * @notice Preview how much PDuka you get for X USDC (6 decimals)
     */
    function previewUSDCPurchase(uint256 usdcAmount) external pure returns (uint256 pdukaAmount) {
        pdukaAmount = (usdcAmount * 10 ** 18) / PDUKA_PRICE_USD;
    }
}
