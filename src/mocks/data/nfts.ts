import type { NFT } from "../../api/nfts";

export const nftDatabase: NFT[] = [
    {
        id: "1",
        name: "Emerald Ape",
        collection: "Genesis Collection",
        creator: "Kurio Studio",
        image: "/images/nft-01.png",
        images: [
            "/images/nft-01.png",
        ],
        priceEth: "0.85",
        available: 8,
        category: "Arte",
        editions: [
            {
                id: "emerald-1-1",
                type: "1/1",
                available: 1,
                priceEth: "1.50",
            },
            {
                id: "emerald-1-10",
                type: "1/10",
                available: 4,
                priceEth: "1.10",
            },
            {
                id: "emerald-1-50",
                type: "1/50",
                available: 8,
                priceEth: "0.85",
            },
            {
                id: "emerald-open",
                type: "OPEN",
                available: 50,
                priceEth: "0.65",
            },
        ],
    },
    {
        id: "2",
        name: "Sage Nomad",
        collection: "Genesis Collection",
        creator: "Kurio Studio",
        image: "/images/nft-02.png",
        images: [
            "/images/nft-02.png",
        ],
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
        images: [
            "/images/nft-03.png",
        ],
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
        images: [
            "/images/nft-04.png",
        ],
        priceEth: "2.10",
        available: 3,
        category: "Música",
    },
];