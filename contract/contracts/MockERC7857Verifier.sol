// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IERC7857DataVerifier.sol";

/**
 * @title MockERC7857Verifier
 * @notice Testnet/local mock. For production use a real TEE/ZKP verifier.
 * @dev verifyPreimage: each proof >= 32 bytes → dataHash = first 32 bytes, isValid = true.
 *      verifyTransferValidity: each proof = abi.encode(oldDataHash, newDataHash, receiver, sealedKey) → returns those, isValid = true.
 */
contract MockERC7857Verifier is IERC7857DataVerifier {
    function verifyPreimage(bytes[] calldata _proofs)
        external
        pure
        override
        returns (PreimageProofOutput[] memory out)
    {
        out = new PreimageProofOutput[](_proofs.length);
        for (uint256 i = 0; i < _proofs.length; i++) {
            if (_proofs[i].length >= 32) {
                bytes32 dataHash;
                bytes calldata p = _proofs[i];
                assembly {
                    dataHash := calldataload(p.offset)
                }
                out[i] = PreimageProofOutput({ dataHash: dataHash, isValid: true });
            } else {
                out[i] = PreimageProofOutput({ dataHash: bytes32(0), isValid: false });
            }
        }
    }

    function verifyTransferValidity(bytes[] calldata _proofs)
        external
        pure
        override
        returns (TransferValidityProofOutput[] memory out)
    {
        out = new TransferValidityProofOutput[](_proofs.length);
        for (uint256 i = 0; i < _proofs.length; i++) {
            (
                bytes32 oldDataHash,
                bytes32 newDataHash,
                address receiver,
                bytes16 sealedKey
            ) = abi.decode(
                _proofs[i],
                (bytes32, bytes32, address, bytes16)
            );
            out[i] = TransferValidityProofOutput({
                oldDataHash: oldDataHash,
                newDataHash: newDataHash,
                receiver: receiver,
                sealedKey: sealedKey,
                isValid: true
            });
        }
    }
}
