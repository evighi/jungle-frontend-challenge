import type { NFT } from "../../api/nfts";

export const nftDatabase: NFT[] = [
  {
    id: "1",
    name: "Emerald Ape",
    collection: "Genesis Collection",
    creator: "Kurio Studio",
    image: "/images/nft-01.png",
    priceEth: "0.85",
    available: 8,
    category: "Arte",
  },
  {
    id: "2",
    name: "Sage Nomad",
    collection: "Genesis Collection",
    creator: "Kurio Studio",
    image: "/images/nft-02.png",
    priceEth: "1.20",
    available: 5,
    category: "Arte",
  },
  {
    id: "3",
    name: "Neon Vessel",
    collection: "Cyber Collection",
    creator: "Kurio Studio",
    image: "/images/nft-03.png",
    priceEth: "0.65",
    available: 12,
    category: "Digital",
  },
  {
    id: "4",
    name: "Golden Beat",
    collection: "Genesis Collection",
    creator: "Kurio Studio",
    image: "/images/nft-04.png",
    priceEth: "2.10",
    available: 3,
    category: "Música",
  },
];