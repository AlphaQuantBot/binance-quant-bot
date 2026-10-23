// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Binance Quant Scalper Token ($QUANT)
 * @dev Official BEP-20 / ERC-20 token for the Binance Autonomous Quant Scalper ecosystem.
 * 
 * Features:
 * - Fixed 100,000,000 QUANT Supply (No infinite mint backdoor)
 * - Deflationary Burn Mechanism: Powers the Bot's algorithmic Buyback & Burn program
 * - Standard BEP-20 compliance (Compatible with PancakeSwap, Trust Wallet, MetaMask, Binance Web3)
 * - Zero transaction taxes (100% fair launch, no hidden honeypot or transfer fees)
 */

interface IBEP20 {
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function getOwner() external view returns (address);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address _owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokensBurned(address indexed burner, uint256 amount);
}

contract QuantToken is IBEP20 {
    string private constant _name = "Binance Quant Scalper";
    string private constant _symbol = "QUANT";
    uint8 private constant _decimals = 18;
    
    // Fixed Initial & Maximum Supply: 100,000,000 QUANT (with 18 decimals)
    uint256 private _totalSupply = 100_000_000 * 10**uint256(_decimals);
    uint256 public totalBurned = 0;
    
    address private _owner;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == _owner, "QUANT: caller is not the owner");
        _;
    }

    constructor() {
        _owner = msg.sender;
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function getOwner() external view override returns (address) {
        return _owner;
    }

    function name() external pure override returns (string memory) {
        return _name;
    }

    function symbol() external pure override returns (string memory) {
        return _symbol;
    }

    function decimals() external pure override returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "QUANT: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        _transfer(sender, recipient, amount);
        return true;
    }

    /**
     * @dev Destroys `amount` tokens from caller's account, reducing total supply.
     * Used by the Binance Quant Bot Buyback & Burn engine to create deflationary pressure.
     */
    function burn(uint256 amount) external returns (bool) {
        require(_balances[msg.sender] >= amount, "QUANT: burn amount exceeds balance");
        unchecked {
            _balances[msg.sender] -= amount;
            _totalSupply -= amount;
            totalBurned += amount;
        }
        emit Transfer(msg.sender, address(0), amount);
        emit TokensBurned(msg.sender, amount);
        return true;
    }

    /**
     * @dev Renounce contract ownership to make the token 100% community-owned and trustless.
     */
    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "QUANT: transfer from zero address");
        require(recipient != address(0), "QUANT: transfer to zero address");
        require(_balances[sender] >= amount, "QUANT: transfer exceeds balance");

        unchecked {
            _balances[sender] -= amount;
            _balances[recipient] += amount;
        }

        emit Transfer(sender, recipient, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "QUANT: approve from zero address");
        require(spender != address(0), "QUANT: approve to zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}
