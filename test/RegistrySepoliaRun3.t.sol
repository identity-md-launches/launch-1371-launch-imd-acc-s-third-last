// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {OracleAttestation, OracleAttestationConsumer} from "../src/oracle/OracleAttestation.sol";
import {MockIntake, MintableIMD, MockProject} from "./mocks/MockIntake.sol";

/// @dev Sepolia test run 3 as launch.json will deploy it: the registry alone, constructed from the
/// manifest's own arguments (read from the file, not retyped) on chain 11155111, with the mock
/// Intake and a mintable IMD standing in *at the live addresses* the manifest names. The oracle
/// signer's key is not ours, so nothing here can be listed: these are the paths that need no
/// signature (asking, the body the panel reads, refusals, expiry, bonds), and the proof that no
/// other key, no contract signer and no setter can stand in for 0x5598...2982.
contract RegistrySepoliaRun3Test is Test {
    address internal constant INTAKE_V2 = 0xa43e6F75ee006411F79Ac1C84120606C2330DE82;
    address internal constant SEPOLIA_ORACLE_IMD = 0x44a1Cd38474FB1748400E7DEb5F8D786ccE3F89A;
    address internal constant SEPOLIA_STACKER = 0x0457276D7b036818B3EddC1A4A3FCeda61e9314d;
    address internal constant ORACLE_SIGNER = 0x5598Aa9146215Bc13eb26f2c692Ad1461Fd32982;
    uint256 internal constant FEE = 0.5e18;
    uint256 internal constant SEPOLIA_CALLBACK_GAS = 1_000_000;

    ProjectRegistry internal reg;
    MockIntake internal intake = MockIntake(INTAKE_V2);
    MintableIMD internal imd = MintableIMD(SEPOLIA_ORACLE_IMD);
    address internal project;
    address internal applicant = makeAddr("applicant");
    address internal challenger = makeAddr("challenger");
    address internal beneficiary = makeAddr("beneficiary");
    uint256 internal uuid;

    function setUp() public {
        vm.chainId(11_155_111);
        vm.roll(11_896_985);
        vm.warp(1_791_900_000);

        string memory json = vm.readFile("./launch.json");
        assertEq(vm.parseJsonString(json, ".contracts[0].contract"), "ProjectRegistry");
        string[] memory a = vm.parseJsonStringArray(json, ".contracts[0].constructorArgs");
        assertEq(a.length, 7);
        // The constructor makes no external call, so the live addresses need no code yet.
        assertEq(INTAKE_V2.code.length, 0);
        reg = new ProjectRegistry(
            vm.parseAddress(a[0]),
            vm.parseAddress(a[1]),
            vm.parseAddress(a[2]),
            vm.parseAddress(a[3]),
            vm.parseUint(a[4]),
            vm.parseUint(a[5]),
            uint64(vm.parseUint(a[6]))
        );

        // Test doubles at the live addresses: the Intake sells the question for 0.5 test IMD.
        vm.etch(INTAKE_V2, address(new MockIntake()).code);
        intake.setPrice(FEE);
        vm.etch(SEPOLIA_ORACLE_IMD, address(new MintableIMD()).code);
        project = address(new MockProject());
        _fund(applicant);
        _fund(challenger);
    }

    function _fund(address who) internal {
        imd.mint(who, 100e18);
        vm.prank(who);
        imd.approve(address(reg), type(uint256).max);
    }

    function _attestation(bool yes) internal returns (OracleAttestation.Attestation memory a) {
        a.requestId = bytes32(++uuid << 128);
        a.chainId = 1;
        a.questionHash = keccak256("q");
        a.answerType = OracleAttestation.ANSWER_BOOL;
        a.answer = abi.encode(yes);
        a.fromBlock = uint64(block.number - 10);
        a.toBlock = uint64(block.number - 5);
        a.blockHash = keccak256("block");
        a.panelJobId = bytes32(uuid << 128);
        a.panelSize = 15;
        a.quorum = 11;
        a.agreed = 11;
        a.issuedAt = uint64(block.timestamp);
        a.expiresAt = uint64(block.timestamp + 1 days);
    }

    function _sign(OracleAttestation.Attestation memory a, uint256 key)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, reg.attestationDigest(a));
        return abi.encodePacked(r, s, v);
    }

    function _apply() internal returns (bytes32 id) {
        vm.prank(applicant);
        id = reg.applyListing(project, "PLEA", "https://github.com/khaed1/plea", 50, beneficiary);
    }

    // ───────────────────────── the manifest's wiring, live ─────────────────────────

    function test_manifestWiring_andTheFeeIsReadLiveFromTheIntakeAddress() public {
        assertEq(address(reg.intake()), INTAKE_V2);
        assertEq(address(reg.oracleAsset()), SEPOLIA_ORACLE_IMD);
        assertEq(reg.stacker(), SEPOLIA_STACKER, "test run 2's live Stacker, not a new one");
        assertEq(reg.oracleSigner(), ORACLE_SIGNER);
        assertEq(reg.questionChainId(), 1, "filed under chain 1: the oracle has no Sepolia RPC");
        assertEq(reg.challengeBond(), 5e18);
        assertEq(reg.challengeCooldown(), 3600);
        assertEq(reg.ORACLE_FEE(), FEE, "0.5 test IMD, as read on Sepolia");
        // Not a constant: a price move at the Intake is what the next ask pays.
        intake.setPrice(0.7e18);
        assertEq(reg.ORACLE_FEE(), 0.7e18);
        uint256 before = imd.balanceOf(applicant);
        _apply();
        assertEq(before - imd.balanceOf(applicant), 0.7e18);
        intake.setPrice(0);
        assertEq(reg.ORACLE_FEE(), 0, "zero means the action is not sold");
    }

    function test_noOwnerAndNoWayToRotateTheSignerOrTheWiring() public {
        string[6] memory setters = [
            "owner()",
            "setOracleSigner(address)",
            "setSigner(address)",
            "setIntake(address)",
            "setPayment(address,uint256)",
            "transferOwnership(address)"
        ];
        for (uint256 i; i < setters.length; ++i) {
            bytes memory data = abi.encodeWithSignature(setters[i], address(this), uint256(0));
            (bool ok,) = address(reg).call(data);
            assertFalse(ok, setters[i]);
        }
        assertEq(reg.oracleSigner(), ORACLE_SIGNER);
        assertEq(
            ORACLE_SIGNER.code.length, 0, "the signer is a key, so only its ECDSA path is open"
        );
    }

    // ───────────────────────── what the panel reads ─────────────────────────

    function test_applicationBody_namesSepoliaTheLiveStackerAndThisRegistry() public {
        bytes32 id = _apply();
        string memory body = string(intake.bodyOf(id));
        assertEq(vm.parseJsonUint(body, ".chainId"), 1, "routed to the oracle's chain");
        assertEq(vm.parseJsonUint(body, ".consumer.chainId"), 11_155_111, "signed for Sepolia");
        assertEq(vm.parseJsonAddress(body, ".consumer.verifyingContract"), address(reg));
        string memory q = vm.parseJsonString(body, ".question");
        assertTrue(vm.contains(q, "on chain 11155111"), "the text names the real chain");
        assertTrue(
            vm.contains(q, vm.toLowercase(vm.toString(SEPOLIA_STACKER))), "names the live Stacker"
        );
        assertTrue(vm.contains(q, vm.toLowercase(vm.toString(address(reg)))));
        assertTrue(vm.contains(q, vm.toLowercase(vm.toString(project))));
        assertFalse(vm.contains(q, "on chain 1."), "never claims the project lives on mainnet");
    }

    /// @dev Version 2 of the rules (docs/panel-rules-v2.md), character for character, with the
    /// registry's substitutions. The spec is the oracle here, not the code.
    function test_applicationDefinitions_areVersionTwoVerbatim() public {
        bytes32 id = _apply();
        string memory body = string(intake.bodyOf(id));
        string memory p = vm.toLowercase(vm.toString(project));
        string memory b = vm.toLowercase(vm.toString(beneficiary));
        string[] memory keys = vm.parseJsonKeys(body, ".definitions");
        assertEq(keys.length, 8);

        assertEq(
            vm.parseJsonString(body, ".definitions.trading"),
            string.concat(
                p,
                " is a trading venue (for example a Uniswap v4 hook, a pool or a launchpad). Every call it can make to credit(trader, amount) on the Stacker happens while executing a trade, for the trader of that trade, with IMD from the fees of that trade. A wallet, an unverified contract, or a contract that can call credit outside a trade, for wallets it picks, or with IMD that is not from the trade fails this rule."
            )
        );
        assertEq(
            vm.parseJsonString(body, ".definitions.trader"),
            "The project never chooses who is credited. The trader may be the address the swap caller passes in hookData, as routers do, with the swap sender as the fallback; that address counts as the trader of that trade."
        );
        assertEq(
            vm.parseJsonString(body, ".definitions.otherPayouts"),
            "Cashback that is not credited through the Stacker is allowed and simply earns no points: for example plain IMD paid when credit reverts, or a payout in another form when crediting is not possible. Such payouts never break the trading or rate rules."
        );
        assertEq(
            vm.parseJsonString(body, ".definitions.rate"),
            "Each credit is 50 basis points of its trade (100 basis points = 1%), and that rate is between 25 and 100. If the rate can change, the code must keep it between 25 and 100 and 50 must be the rate in force now."
        );
        assertEq(
            vm.parseJsonString(body, ".definitions.feeGuard"),
            "Split the trading fee into three parts: the cashback; the parts that come back to the owner or team (owner share, treasury, liquidity or reserves the owner or team can withdraw); and the parts that leave for good (burned tokens, prizes paid to others, fees to third parties, locked value as in lockedValue). The parts that leave for good must add up to at least the cashback. If the rate or the fee split can change, the code must keep this true for every allowed setting."
        );
        assertEq(
            vm.parseJsonString(body, ".definitions.lockedValue"),
            "Liquidity or reserves that no owner or team wallet can ever withdraw count as leaving for good, even if the contract itself can move them between its own positions or pools."
        );
        assertEq(
            vm.parseJsonString(body, ".definitions.beneficiary"),
            string.concat(
                b,
                " must be the owner of ",
                p,
                ", or a wallet its verified source or its official website names as its team or treasury."
            )
        );
        assertEq(
            vm.parseJsonString(body, ".definitions.evidence"),
            "Use the verified source published for this address on the chain named in the question, on its block explorer (Etherscan or Blockscout) or on Sourcify; a full or partial match on any one of them is verified source. Use on-chain reads at the latest block. Code with no verified source on any of them, or unreadable code, means false."
        );
        for (uint256 i; i < keys.length; ++i) {
            string memory d = vm.parseJsonString(body, string.concat(".definitions.", keys[i]));
            assertLe(bytes(d).length, 512, keys[i]);
        }
    }

    /// forge-config: default.fuzz.runs = 300
    /// @dev Every allowed rate reaches the panel as stated, in both places the rule names it.
    function testFuzz_applicationRateReachesThePanelTwice(uint16 rate) public {
        rate = uint16(bound(rate, 25, 100));
        vm.prank(applicant);
        bytes32 id = reg.applyListing(project, "PLEA", "https://x.example/p", rate, beneficiary);
        string memory r = vm.toString(rate);
        string memory rule = vm.parseJsonString(string(intake.bodyOf(id)), ".definitions.rate");
        assertTrue(vm.contains(rule, string.concat("Each credit is ", r, " basis points")));
        assertTrue(vm.contains(rule, string.concat("and ", r, " must be the rate in force now.")));
    }

    // ───────────────────────── only the oracle signer settles ─────────────────────────

    /// forge-config: default.fuzz.runs = 300
    /// @dev No key but the signer's can list a project, however well-formed the attestation.
    function testFuzz_noOtherKeyCanSettle(uint256 key) public {
        key = bound(key, 1, 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140);
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        bytes memory sig = _sign(a, key);
        vm.prank(INTAKE_V2);
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, sig);
        // Through the Intake's try, the same thing: the callback fails, nothing is listed, and the
        // question is recoverable because the Intake marked it completed.
        assertFalse(intake.deliver(id, a, sig, SEPOLIA_CALLBACK_GAS));
        assertFalse(reg.isListed(project));
        assertFalse(reg.consumed(a.requestId));
        reg.expire(project);
        assertEq(uint8(reg.projectOf(project).ask), uint8(ProjectRegistry.Ask.None));
    }

    function test_answerSignedForAnotherRegistryOrAnotherChainIsRefused() public {
        bytes32 id = _apply();
        OracleAttestation.Attestation memory a = _attestation(true);
        // A registry at another address, same signer key as ours would be: a different domain.
        ProjectRegistry other = new ProjectRegistry(
            INTAKE_V2, SEPOLIA_ORACLE_IMD, SEPOLIA_STACKER, vm.addr(0xA11CE), 1, 5e18, 3600
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xA11CE, other.attestationDigest(a));
        vm.prank(INTAKE_V2);
        vm.expectRevert(OracleAttestationConsumer.BadSignature.selector);
        reg.onOracleResult(id, a, abi.encodePacked(r, s, v));

        // The same contract address on mainnet (chain 1) has a different domain too.
        vm.chainId(1);
        bytes32 mainnetDigest = reg.attestationDigest(a);
        vm.chainId(11_155_111);
        assertNotEq(mainnetDigest, reg.attestationDigest(a), "chain id is in the domain");
    }

    // ───────────────────────── the paths that need no signature ─────────────────────────

    function test_refusedApplication_spendsTheFeeAndFreesTheProject() public {
        uint256 before = imd.balanceOf(applicant);
        bytes32 id = _apply();
        assertEq(before - imd.balanceOf(applicant), FEE);
        assertTrue(intake.fail(id, 1, "body_refused", SEPOLIA_CALLBACK_GAS));
        assertEq(imd.balanceOf(applicant), before - FEE, "the price is spent, not refunded");
        assertEq(imd.balanceOf(address(reg)), 0);
        assertFalse(reg.isListed(project));
        assertEq(uint8(reg.projectOf(project).ask), uint8(ProjectRegistry.Ask.None));
        _apply(); // open again at once
    }

    function test_splitPanel_clearsWithoutListing_andTheProjectCanAskAgain() public {
        bytes32 id = _apply();
        vm.expectEmit(true, true, false, true, address(reg));
        emit ProjectRegistry.AskCleared(
            project, id, ProjectRegistry.Ask.Apply, 2, bytes32("disagreed")
        );
        assertTrue(intake.fail(id, 2, "disagreed", SEPOLIA_CALLBACK_GAS));
        assertFalse(reg.isListed(project));
        bytes32 again = _apply();
        assertNotEq(again, id);
    }

    function test_unansweredApplication_isClearedByAnyoneAfterADay() public {
        _apply();
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(ProjectRegistry.NotStale.selector);
        reg.expire(project);
        vm.warp(block.timestamp + 1);
        vm.prank(makeAddr("anyone"));
        reg.expire(project);
        assertEq(uint8(reg.projectOf(project).ask), uint8(ProjectRegistry.Ask.None));
    }

    /// @dev A challenge can only exist on a listed project, and listing takes the oracle's key.
    /// With the launch's own signer nothing can be listed here, so every challenge entry point
    /// refuses and moves nothing: the 5 test IMD bond is never pulled for an unlisted project.
    function test_challengeOnAnUnlistedProjectMovesNothing() public {
        uint256 before = imd.balanceOf(challenger);
        vm.prank(challenger);
        vm.expectRevert(ProjectRegistry.NotListed.selector);
        reg.challenge(project, "Not listed yet.");
        vm.prank(challenger);
        vm.expectRevert(ProjectRegistry.NotListed.selector);
        reg.challengeForBeneficiary(project, "Not listed yet.", beneficiary);
        _apply();
        vm.prank(challenger);
        vm.expectRevert(ProjectRegistry.NotListed.selector);
        reg.challengeForBeneficiary(project, "Application open.", beneficiary);
        assertEq(imd.balanceOf(challenger), before);
        assertEq(imd.balanceOf(address(reg)), 0);
    }

    function test_failureFromAnyoneButTheIntakeIsRefused() public {
        bytes32 id = _apply();
        vm.expectRevert(ProjectRegistry.NotIntake.selector);
        reg.onOracleFailure(id, 2, "disagreed", 0, 0, "");
        vm.prank(ORACLE_SIGNER);
        vm.expectRevert(ProjectRegistry.NotIntake.selector);
        reg.onOracleFailure(id, 2, "disagreed", 0, 0, "");
        assertEq(uint8(reg.projectOf(project).ask), uint8(ProjectRegistry.Ask.Apply));
    }

    /// @dev Sepolia's Intake gives the callback 1M gas; the registry must also fit mainnet's 200k,
    /// which is where this code goes next. A refusal of a cold application fits both.
    function test_failureCallbackFitsMainnetGasToo() public {
        bytes32 id = _apply();
        assertTrue(intake.fail(id, 1, "body_invalid", 200_000));
        assertEq(uint8(reg.projectOf(project).ask), uint8(ProjectRegistry.Ask.None));
    }
}
