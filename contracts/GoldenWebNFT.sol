// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title GoldenWeb NFT
/// @notice Owning at least one GoldenWeb NFT grants lifetime Premium access on GOLDENWEB.UZ.
/// @dev Mint is paid in USDT. Price doubles every 30 days from launch until it reaches 640 USDT.
contract GoldenWebNFT is ERC721, Ownable {
    using Strings for uint256;
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    uint256 public immutable maxSupply;
    uint256 public immutable launchTimestamp;
    uint256 public mintPrice;
    uint256 public maxPerWallet;
    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    mapping(address => uint256) public mintedByWallet;

    event MintPriceUpdated(uint256 newPrice);
    event BaseURIUpdated(string newBaseURI);
    event MaxPerWalletUpdated(uint256 newMaxPerWallet);

    constructor(
        string memory baseTokenURI_,
        address usdt_,
        uint256 maxSupply_,
        uint256 maxPerWallet_,
        uint256 launchTimestamp_
    ) ERC721("GoldenWeb", "GWEB") Ownable(msg.sender) {
        require(usdt_ != address(0), "Invalid USDT");
        require(maxSupply_ > 0, "Invalid supply");
        require(maxPerWallet_ > 0, "Invalid wallet limit");
        require(maxPerWallet_ <= 10, "Wallet limit too high");

        usdt = IERC20(usdt_);
        maxSupply = maxSupply_;
        maxPerWallet = maxPerWallet_;
        launchTimestamp = launchTimestamp_ == 0 ? block.timestamp : launchTimestamp_;
        _baseTokenURI = baseTokenURI_;
        mintPrice = 10 * 10 ** 6; // 10 USDT, assuming 6-decimal BSC USDT
    }

    function mint(uint256 quantity) external {
        require(quantity > 0, "Quantity is zero");
        require(quantity <= 10, "Max 10 per tx");
        require(totalSupply() + quantity <= maxSupply, "Sold out");
        require(mintedByWallet[msg.sender] + quantity <= maxPerWallet, "Wallet limit");

        uint256 totalCost = mintPrice * quantity;
        usdt.safeTransferFrom(msg.sender, address(this), totalCost);

        mintedByWallet[msg.sender] += quantity;

        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, _nextTokenId++);
        }
    }

    function currentMonth() public view returns (uint256) {
        if (block.timestamp < launchTimestamp) return 0;
        return (block.timestamp - launchTimestamp) / 30 days;
    }

    function currentMintPrice() public view returns (uint256) {
        uint256 monthIndex = currentMonth();
        if (monthIndex >= 6) return 640 * 10 ** 6;
        return (10 * 10 ** 6) * (2 ** monthIndex);
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    function remainingSupply() external view returns (uint256) {
        return maxSupply - totalSupply();
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    function setMaxPerWallet(uint256 newMaxPerWallet) external onlyOwner {
        require(newMaxPerWallet > 0 && newMaxPerWallet <= 10, "Invalid wallet limit");
        maxPerWallet = newMaxPerWallet;
        emit MaxPerWalletUpdated(newMaxPerWallet);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function syncMintPrice() public {
        mintPrice = currentMintPrice();
        emit MintPriceUpdated(mintPrice);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_baseTokenURI, tokenId.toString(), ".json");
    }

    function withdrawUSDT(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 amount = usdt.balanceOf(address(this));
        usdt.safeTransfer(recipient, amount);
    }
}
