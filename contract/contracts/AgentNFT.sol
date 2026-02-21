// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IERC7857.sol";
import "./interfaces/IERC7857Metadata.sol";
import "./interfaces/IERC7857DataVerifier.sol";

/**
 * @title AgentNFT
 * @notice ERC-7857 INFT extending ERC-721: tokenized AI agents with verifier-backed mint/transfer/clone.
 * @dev Extends OpenZeppelin ERC721 for standard NFT compatibility (balanceOf, safeTransferFrom, etc.).
 */
contract AgentNFT is AccessControl, ERC721, IERC7857, IERC7857Metadata {
    using Strings for uint256;

    struct TokenData {
        string[] dataDescriptions;
        bytes32[] dataHashes;
        address[] authorizedUsers;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    string private _chainURL;
    string private _indexerURL;
    IERC7857DataVerifier private _verifier;
    uint256 private _nextTokenId;
    mapping(uint256 => TokenData) private _tokenData;

    constructor(
        string memory name_,
        string memory symbol_,
        address verifierAddr,
        string memory chainURL_,
        string memory indexerURL_
    ) ERC721(name_, symbol_) {
        require(verifierAddr != address(0), "Zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _chainURL = chainURL_;
        _indexerURL = indexerURL_;
        _verifier = IERC7857DataVerifier(verifierAddr);
    }

    function verifier() public view virtual returns (IERC7857DataVerifier) {
        return _verifier;
    }

    function updateVerifier(address newVerifier) external onlyRole(ADMIN_ROLE) {
        require(newVerifier != address(0), "Zero address");
        _verifier = IERC7857DataVerifier(newVerifier);
    }

    function updateURLs(
        string memory newChainURL,
        string memory newIndexerURL
    ) external onlyRole(ADMIN_ROLE) {
        _chainURL = newChainURL;
        _indexerURL = newIndexerURL;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControl, ERC721) returns (bool) {
        return
            interfaceId == type(IERC7857).interfaceId ||
            interfaceId == type(IERC7857Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function name() public view virtual override(ERC721, IERC7857Metadata) returns (string memory) {
        return ERC721.name();
    }

    function symbol() public view virtual override(ERC721, IERC7857Metadata) returns (string memory) {
        return ERC721.symbol();
    }

    function ownerOf(uint256 tokenId) public view virtual override(ERC721, IERC7857) returns (address) {
        return ERC721.ownerOf(tokenId);
    }

    function update(uint256 tokenId, bytes[] calldata proofs) external virtual {
        require(ownerOf(tokenId) == msg.sender, "Not owner");

        PreimageProofOutput[] memory proofOut = _verifier.verifyPreimage(proofs);
        bytes32[] memory newDataHashes = new bytes32[](proofOut.length);

        for (uint256 i = 0; i < proofOut.length; i++) {
            require(
                proofOut[i].isValid,
                string(
                    abi.encodePacked(
                        "Invalid preimage proof at index ",
                        i.toString(),
                        " with data hash ",
                        uint256(proofOut[i].dataHash).toHexString(32)
                    )
                )
            );
            newDataHashes[i] = proofOut[i].dataHash;
        }

        bytes32[] memory oldDataHashes = _tokenData[tokenId].dataHashes;
        _tokenData[tokenId].dataHashes = newDataHashes;

        emit Updated(tokenId, oldDataHashes, newDataHashes);
    }

    function mint(
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        address to
    ) external payable virtual returns (uint256 tokenId) {
        require(
            dataDescriptions.length == proofs.length,
            "Descriptions and proofs length mismatch"
        );

        if (to == address(0)) to = msg.sender;

        PreimageProofOutput[] memory proofOut = _verifier.verifyPreimage(proofs);
        bytes32[] memory dataHashes = new bytes32[](proofOut.length);

        for (uint256 i = 0; i < proofOut.length; i++) {
            require(
                proofOut[i].isValid,
                string(
                    abi.encodePacked(
                        "Invalid preimage proof at index ",
                        i.toString(),
                        " with data hash ",
                        uint256(proofOut[i].dataHash).toHexString(32)
                    )
                )
            );
            dataHashes[i] = proofOut[i].dataHash;
        }

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _tokenData[tokenId] = TokenData({
            dataHashes: dataHashes,
            dataDescriptions: dataDescriptions,
            authorizedUsers: new address[](0)
        });

        emit Minted(tokenId, msg.sender, to, dataHashes, dataDescriptions);
    }

    function transfer(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) external virtual {
        require(to != address(0), "Zero address");
        require(ownerOf(tokenId) == msg.sender, "Not owner");

        _validateTransferProofsAndUpdateData(tokenId, to, proofs);

        _transfer(msg.sender, to, tokenId);
        emit Transferred(tokenId, msg.sender, to);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) external virtual {
        require(to != address(0), "Zero address");
        require(ownerOf(tokenId) == from, "Not owner");
        require(
            getApproved(tokenId) == msg.sender ||
                isApprovedForAll(from, msg.sender),
            "Not approved"
        );

        _validateTransferProofsAndUpdateData(tokenId, to, proofs);

        _transfer(from, to, tokenId);
        emit Transferred(tokenId, from, to);
    }

    function clone(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) external virtual returns (uint256 newTokenId) {
        require(to != address(0), "Zero address");
        require(ownerOf(tokenId) == msg.sender, "Not owner");

        (
            bytes32[] memory newDataHashes,
            bytes16[] memory sealedKeys
        ) = _validateTransferProofs(tokenId, to, proofs);

        newTokenId = _nextTokenId++;
        _safeMint(to, newTokenId);
        _tokenData[newTokenId] = TokenData({
            dataHashes: newDataHashes,
            dataDescriptions: _tokenData[tokenId].dataDescriptions,
            authorizedUsers: new address[](0)
        });

        emit Cloned(tokenId, newTokenId, msg.sender, to);
        emit PublishedSealedKey(to, newTokenId, sealedKeys);
    }

    function cloneFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) external virtual returns (uint256 newTokenId) {
        require(to != address(0), "Zero address");
        require(ownerOf(tokenId) == from, "Not owner");
        require(
            getApproved(tokenId) == msg.sender ||
                isApprovedForAll(from, msg.sender),
            "Not approved"
        );

        (
            bytes32[] memory newDataHashes,
            bytes16[] memory sealedKeys
        ) = _validateTransferProofs(tokenId, to, proofs);

        newTokenId = _nextTokenId++;
        _safeMint(to, newTokenId);
        _tokenData[newTokenId] = TokenData({
            dataHashes: newDataHashes,
            dataDescriptions: _tokenData[tokenId].dataDescriptions,
            authorizedUsers: new address[](0)
        });

        emit Cloned(tokenId, newTokenId, from, to);
        emit PublishedSealedKey(to, newTokenId, sealedKeys);
    }

    function authorizeUsage(uint256 tokenId, address to) external virtual {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _tokenData[tokenId].authorizedUsers.push(to);
        emit Authorization(msg.sender, to, tokenId);
    }

    function authorizedUsersOf(uint256 tokenId)
        external
        view
        virtual
        returns (address[] memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token not exist");
        return _tokenData[tokenId].authorizedUsers;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721, IERC7857Metadata)
        returns (string memory)
    {
        _requireMinted(tokenId);
        return
            string(
                abi.encodePacked(
                    '{"chainURL":"',
                    _chainURL,
                    '","indexerURL":"',
                    _indexerURL,
                    '"}'
                )
            );
    }

    function dataHashesOf(uint256 tokenId)
        external
        view
        virtual
        returns (bytes32[] memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token not exist");
        return _tokenData[tokenId].dataHashes;
    }

    function dataDescriptionsOf(uint256 tokenId)
        external
        view
        virtual
        returns (string[] memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token not exist");
        return _tokenData[tokenId].dataDescriptions;
    }

    function _validateTransferProofsAndUpdateData(
        uint256 tokenId,
        address to,
        bytes[] calldata proofs
    ) internal {
        (bytes32[] memory newDataHashes, bytes16[] memory sealedKeys) = _validateTransferProofs(
            tokenId,
            to,
            proofs
        );
        _tokenData[tokenId].dataHashes = newDataHashes;
        emit PublishedSealedKey(to, tokenId, sealedKeys);
    }

    function _validateTransferProofs(
        uint256 tokenId,
        address to,
        bytes[] calldata proofs
    ) internal returns (bytes32[] memory newDataHashes, bytes16[] memory sealedKeys) {
        TransferValidityProofOutput[] memory proofOut = _verifier
            .verifyTransferValidity(proofs);
        newDataHashes = new bytes32[](proofOut.length);
        sealedKeys = new bytes16[](proofOut.length);

        for (uint256 i = 0; i < proofOut.length; i++) {
            require(
                proofOut[i].isValid &&
                    proofOut[i].oldDataHash == _tokenData[tokenId].dataHashes[i] &&
                    proofOut[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Invalid transfer validity proof at index ",
                        i.toString()
                    )
                )
            );
            sealedKeys[i] = proofOut[i].sealedKey;
            newDataHashes[i] = proofOut[i].newDataHash;
        }
    }

    string public constant VERSION = "1.0.0";
}
