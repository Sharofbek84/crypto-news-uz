// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title GoldenWeb NFT
/// @notice Owning at least one GoldenWeb NFT grants lifetime Premium access on GOLDENWEB.UZ.
/// @dev The website should check balanceOf(wallet) on this contract. If the NFT is transferred,
///      Premium access follows the new owner automatically.
contract GoldenWebNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 public immutable maxSupply;
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
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxPerWallet_
    ) ERC721("GoldenWeb", "GWEB") Ownable(msg.sender) {
        require(maxSupply_ > 0, "Invalid supply");
        require(maxPerWallet_ > 0, "Invalid wallet limit");
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        maxPerWallet = maxPerWallet_;
        _baseTokenURI = baseTokenURI_;
    }

    function mint(uint256 quantity) external payable {
        require(quantity > 0, "Quantity is zero");
        require(quantity <= 5, "Max 5 per tx");
        require(totalSupply() + quantity <= maxSupply, "Sold out");
        require(mintedByWallet[msg.sender] + quantity <= maxPerWallet, "Wallet limit");
        require(msg.value == mintPrice * quantity, "Incorrect payment");

        mintedByWallet[msg.sender] += quantity;

        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, _nextTokenId++);
        }
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
        require(newMaxPerWallet > 0, "Invalid wallet limit");
        maxPerWallet = newMaxPerWallet;
        emit MaxPerWalletUpdated(newMaxPerWallet);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_baseTokenURI, tokenId.toString(), ".json");
    }

    function withdraw(address payable recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 amount = address(this).balance;
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Transfer failed");
    }
}
