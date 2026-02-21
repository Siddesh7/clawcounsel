// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IERC7857DataVerifier.sol";

/**
 * @title StorageProofVerifier
 * @notice Real 0G flow: mint and transfer/clone require on-chain verification.
 *        Mint: proof = (rootHash, signature). Signer signs rootHash (EIP-191).
 *        Transfer/clone: proof = (oldDataHash, newDataHash, receiver, sealedKey, signature).
 *        Transfer/clone proofs must be signed by the TEE oracle (EIP-191 over
 *        keccak256(abi.encode(oldDataHash, newDataHash, receiver, sealedKey))).
 */
contract StorageProofVerifier is IERC7857DataVerifier {
    address public immutable signer;
    /// @notice TEE oracle signer for transfer/clone. Must be set (real OG flow only).
    address public immutable teeOracleSigner;

    constructor(address _signer, address _teeOracleSigner) {
        require(_signer != address(0), "Zero signer");
        require(_teeOracleSigner != address(0), "TEE oracle required");
        signer = _signer;
        teeOracleSigner = _teeOracleSigner;
    }

    function verifyPreimage(bytes[] calldata _proofs)
        external
        view
        override
        returns (PreimageProofOutput[] memory out)
    {
        out = new PreimageProofOutput[](_proofs.length);
        for (uint256 i = 0; i < _proofs.length; i++) {
            bytes32 rootHash;
            bytes memory signature;
            (rootHash, signature) = abi.decode(
                _proofs[i],
                (bytes32, bytes)
            );
            if (signature.length != 65) {
                out[i] = PreimageProofOutput({ dataHash: bytes32(0), isValid: false });
                continue;
            }
            bytes32 ethSignedHash = keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", rootHash)
            );
            uint8 v = uint8(signature[64]);
            if (v < 27) v += 27;
            bytes32 r;
            bytes32 s;
            assembly {
                r := mload(add(signature, 32))
                s := mload(add(signature, 64))
            }
            address recovered = ecrecover(ethSignedHash, v, r, s);
            bool valid = (recovered != address(0) && recovered == signer);
            out[i] = PreimageProofOutput({
                dataHash: rootHash,
                isValid: valid
            });
        }
    }

    function verifyTransferValidity(bytes[] calldata _proofs)
        external
        view
        override
        returns (TransferValidityProofOutput[] memory out)
    {
        out = new TransferValidityProofOutput[](_proofs.length);
        for (uint256 i = 0; i < _proofs.length; i++) {
            bytes32 oldDataHash;
            bytes32 newDataHash;
            address receiver;
            bytes16 sealedKey;
            bytes memory signature;
            (
                oldDataHash,
                newDataHash,
                receiver,
                sealedKey,
                signature
            ) = abi.decode(
                _proofs[i],
                (bytes32, bytes32, address, bytes16, bytes)
            );
            bool valid = _verifyTeeTransferSignature(
                oldDataHash,
                newDataHash,
                receiver,
                sealedKey,
                signature
            );

            out[i] = TransferValidityProofOutput({
                oldDataHash: oldDataHash,
                newDataHash: newDataHash,
                receiver: receiver,
                sealedKey: sealedKey,
                isValid: valid
            });
        }
    }

    /// @dev EIP-191: hash = keccak256("\x19Ethereum Signed Message:\n32" || innerHash), innerHash = keccak256(abi.encode(...))
    function _verifyTeeTransferSignature(
        bytes32 oldDataHash,
        bytes32 newDataHash,
        address receiver,
        bytes16 sealedKey,
        bytes memory signature
    ) internal view returns (bool) {
        if (signature.length != 65) return false;
        bytes32 innerHash = keccak256(
            abi.encode(oldDataHash, newDataHash, receiver, sealedKey)
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash)
        );
        uint8 v = uint8(signature[64]);
        if (v < 27) v += 27;
        bytes32 r;
        bytes32 s;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
        }
        address recovered = ecrecover(ethSignedHash, v, r, s);
        return (recovered != address(0) && recovered == teeOracleSigner);
    }
}
