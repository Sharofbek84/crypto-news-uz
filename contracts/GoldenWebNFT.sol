// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * GoldenWeb NFT Pass — BSC
 * - ERC-721, max supply 1000
 * - Max 10 NFTs per wallet
 * - Payment in USDT (18 decimals on BSC)
 * - All USDT proceeds go to TREASURY
 * - Price starts at 10 USDT and doubles every 30 days, caps at 640 USDT
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract GoldenWebNFT {
    // --- ERC721 minimal ---
    string public name = "GoldenWeb NFT Pass";
    string public symbol = "GWNFT";

    uint256 public totalSupply;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Minted(address indexed to, uint256 quantity, uint256 unitPrice, uint256 totalPaid);

    // --- Sale config ---
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MAX_PER_WALLET = 10;
    uint256 public constant PRICE_START = 10 ether; // 10 * 1e18 USDT (18 decimals)
    uint256 public constant PRICE_CAP = 640 ether;
    uint256 public constant PRICE_STEP_SECONDS = 30 days;

    // BSC USDT (Binance-Peg): 0x55d398326f99059fF775485246999027B3197955
    IERC20 public immutable usdt;
    address public immutable treasury;
    address public owner;
    uint256 public saleStart;
    string private _baseTokenURI;
    mapping(address => uint256) public mintedByWallet;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address usdt_, address treasury_, string memory baseURI_) {
        require(usdt_ != address(0) && treasury_ != address(0), "Zero address");
        usdt = IERC20(usdt_);
        treasury = treasury_;
        owner = msg.sender;
        saleStart = block.timestamp;
        _baseTokenURI = baseURI_;
    }

    // Current mint price based on months since saleStart
    function mintPrice() public view returns (uint256) {
        uint256 elapsed = block.timestamp > saleStart ? block.timestamp - saleStart : 0;
        uint256 monthsElapsed = elapsed / PRICE_STEP_SECONDS;
        if (monthsElapsed >= 6) return PRICE_CAP;
        // 10 * 2^months
        return PRICE_START * (2 ** monthsElapsed);
    }

    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply;
    }

    function maxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function mint(uint256 quantity) external {
        require(quantity > 0 && quantity <= 10, "Bad quantity");
        require(totalSupply + quantity <= MAX_SUPPLY, "Sold out");
        require(mintedByWallet[msg.sender] + quantity <= MAX_PER_WALLET, "Wallet limit");

        uint256 unit = mintPrice();
        uint256 total = unit * quantity;
        require(usdt.transferFrom(msg.sender, treasury, total), "USDT transfer failed");

        mintedByWallet[msg.sender] += quantity;
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = ++totalSupply;
            _mint(msg.sender, tokenId);
        }
        emit Minted(msg.sender, quantity, unit, total);
    }

    // --- ERC721 ---
    function balanceOf(address owner_) public view returns (uint256) {
        require(owner_ != address(0), "Zero address");
        return _balanceOf[owner_];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _ownerOf[tokenId];
        require(o != address(0), "Nonexistent");
        return o;
    }

    function approve(address to, uint256 tokenId) external {
        address o = ownerOf(tokenId);
        require(msg.sender == o || isApprovedForAll(o, msg.sender), "Not allowed");
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_ownerOf[tokenId] != address(0), "Nonexistent");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner_, address operator) public view returns (bool) {
        return _operatorApprovals[owner_][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not allowed");
        require(ownerOf(tokenId) == from, "Wrong from");
        require(to != address(0), "Zero to");
        delete _tokenApprovals[tokenId];
        _balanceOf[from] -= 1;
        _balanceOf[to] += 1;
        _ownerOf[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf[tokenId] != address(0), "Nonexistent");
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId), ".json"));
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero");
        owner = newOwner;
    }

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "Zero to");
        require(_ownerOf[tokenId] == address(0), "Exists");
        _balanceOf[to] += 1;
        _ownerOf[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address o = ownerOf(tokenId);
        return spender == o || getApproved(tokenId) == spender || isApprovedForAll(o, spender);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
