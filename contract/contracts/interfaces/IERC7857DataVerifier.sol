// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

struct PreimageProofOutput {
    bytes32 dataHash;
    bool isValid;
}

struct TransferValidityProofOutput {
    bytes32 oldDataHash;
    bytes32 newDataHash;
    address receiver;
    bytes16 sealedKey;
    bool isValid;
}

interface IERC7857DataVerifier {
    function verifyPreimage(bytes[] calldata _proofs)
        external
        returns (PreimageProofOutput[] memory);

    function verifyTransferValidity(bytes[] calldata _proofs)
        external
        returns (TransferValidityProofOutput[] memory);
}
