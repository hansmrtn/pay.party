import React, { useEffect, useState, useMemo } from "react";
import { Button, Box, Center, Menu, MenuButton, MenuList, MenuItem, Text } from "@chakra-ui/react";
import { ArrowBackIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { useParams, useHistory } from "react-router-dom";
import { VoteTable, ViewTable, ReceiptsTable, Distribute, Metadata } from "./components";

export default function Party({
  address,
  mainnetProvider,
  localProvider,
  userSigner,
  targetNetwork,
  tx,
  readContracts,
  writeContracts,
  yourLocalBalance,
  isSmartContract
}) {
  const routeHistory = useHistory();
  let { id } = useParams();

  const [partyData, setPartyData] = useState({});
  const [accountVoteData, setAccountVoteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [canVote, setCanVote] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [distribution, setDistribution] = useState();
  const [strategy, setStrategy] = useState("quadratic");
  const [isPaid, setIsPaid] = useState(true);


  useEffect(() => {
    (async () => {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/party/${id}`);
      const party = await res.json();
      const submitted = party.ballots.filter(b => b.data.ballot.address.toLowerCase() === address);
      const participating = party.participants.map(adr => adr.toLowerCase()).includes(address);
      setAccountVoteData(submitted);
      setCanVote(submitted.length === 0 && participating);
      setIsPaid(party.receipts.length > 0);
      setIsParticipant(participating);
      setPartyData(party);
    })();
  }, []);

  // Calculate percent distribution from submitted ballots and memo table
  const calculateDistribution = () => {
    try {
      const votes = partyData.ballots.map(b => JSON.parse(b.data.ballot.votes.replace(/[ \n\r]/g, "")));
      let sum = 0;
      let processed = [];
      let result;
      for (let i = 0; i < partyData.candidates.length; i++) {
        const candidate = partyData.candidates[i];
        switch (strategy.toLowerCase()) {
          default:
            result = votes.reduce((total, vote) => vote[candidate] + total, 0);
            break;
          case "linear":
            result = votes.reduce((total, vote) => vote[candidate] + total, 0);
            break;
          case "quadratic":
            result = votes.reduce((total, vote) => vote[candidate] ** 0.5 + total, 0);
            break;
        }
        sum += result;
        processed.push({ address: candidate, reduced: result });
      }
      let final = [];
      for (let i = 0; i < partyData.candidates.length; i++) {
        const candidate = partyData.candidates[i];
        final.push({ address: candidate, score: processed[i].reduced / sum });
      }
      return final;
    } catch (error) {
      // Silently fail :/
      // console.log("Error: calculating distribution failed!");
      // console.log(error);
    }
  };

  // Cache the calculated distribution and table component
  const cachedViewTable = useMemo(() => {
    try {
      const dist = calculateDistribution();
      setDistribution(dist);
      return (
        <ViewTable
          partyData={partyData}
          mainnetProvider={mainnetProvider}
          votesData={accountVoteData}
          distribution={dist}
          strategy={strategy}
        />
      );
    } catch (error) {
      console.log(error);
      return null;
    }
  }, [partyData, strategy]);

  const cachedVoteTable = useMemo(() => {
    try {
      return (
        <VoteTable
          partyData={partyData}
          address={address}
          userSigner={userSigner}
          targetNetwork={targetNetwork}
          readContracts={readContracts}
          mainnetProvider={mainnetProvider}
        />
      );
    } catch (error) {
      console.log(error);
      return null;
    }
  }, [partyData, readContracts]);

  const StrategySelect = () => {
    return (
      <Menu>
        <MenuButton as={Button} variant="link" rightIcon={<ChevronDownIcon />}>
          {strategy}
        </MenuButton>
        <MenuList>
          <MenuItem
            onClick={() => {
              setStrategy("quadratic");
            }}
          >
            Quadratic
          </MenuItem>
          <MenuItem
            onClick={() => {
              setStrategy("linear");
            }}
          >
            Linear
          </MenuItem>
        </MenuList>
      </Menu>
    );
  };

  return (
    <Box>
      <Button
        size="lg"
        variant="ghost"
        leftIcon={<ArrowBackIcon />}
        onClick={() => {
          routeHistory.push("/");
        }}
      >
        Back
      </Button>
      {/* <Button
        size="lg"
        variant="ghost"
        onClick={() => {
          showDebug ? setShowDebug(false) : setShowDebug(true);
        }}
      >
        Debug
      </Button> */}
      <Center p="5">
        <Box borderWidth={"1px"} shadow="xl" rounded="md" p="10" w="4xl" borderRadius={24}>
          {showDebug && <p>{JSON.stringify(partyData)}</p>}
          <Metadata
            partyData={partyData}
            mainnetProvider={mainnetProvider}
            votesData={accountVoteData}
            distribution={distribution}
            strategy={strategy}
          />
          {canVote ? (
            cachedVoteTable
          ) : (
            <Box>
              <Center pb="2" pt="3">
                <Text pr="3">Strategy:</Text>
                <StrategySelect />
              </Center>
              {cachedViewTable}
            </Box>
          )}
          <Distribute
            partyData={partyData}
            address={address}
            userSigner={userSigner}
            writeContracts={writeContracts}
            readContracts={readContracts}
            tx={tx}
            distribution={distribution}
            strategy={strategy}
            isSmartContract={isSmartContract}
            localProvider={localProvider}
          />
          {isPaid && <ReceiptsTable partyData={partyData} />}
        </Box>
      </Center>
    </Box>
  );
}
