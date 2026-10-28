import { useState } from "react";

import type { NFT } from "../api/nfts";

type InformationTab = "details" | "reviews";

interface NFTInformationProps {
    nft: NFT;
}

export function NFTInformation({
    nft,
}: NFTInformationProps) {
    const [activeTab, setActiveTab] =
        useState<InformationTab>("details");

    return (
        <section
            aria-label="Informações do NFT"
            className="mt-16"
        >
            <div
                role="tablist"
                aria-label="Informações e avaliações"
                className="flex flex-wrap gap-8 border-b border-[#4a3328]"
            >
                <button
                    id="nft-details-tab"
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "details"}
                    aria-controls="nft-information-panel"
                    onClick={() => setActiveTab("details")}
                    className={[
                        "border-b-2 pb-3 text-sm font-semibold transition-colors",
                        activeTab === "details"
                            ? "border-[#d8904c] text-[#d8904c]"
                            : "border-transparent text-[#b09270] hover:text-[#f5e7d8]",
                    ].join(" ")}
                >
                    Detalhes do NFT
                </button>

                <button
                    id="nft-reviews-tab"
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "reviews"}
                    aria-controls="nft-information-panel"
                    onClick={() => setActiveTab("reviews")}
                    className={[
                        "border-b-2 pb-3 text-sm font-semibold transition-colors",
                        activeTab === "reviews"
                            ? "border-[#d8904c] text-[#d8904c]"
                            : "border-transparent text-[#b09270] hover:text-[#f5e7d8]",
                    ].join(" ")}
                >
                    Avaliações de colecionadores
                </button>
            </div>

            <div
                id="nft-information-panel"
                role="tabpanel"
                aria-labelledby={
                    activeTab === "details"
                        ? "nft-details-tab"
                        : "nft-reviews-tab"
                }
                className="py-6"
            >
                {activeTab === "details" ? (
                    <div className="space-y-5 text-sm leading-7 text-[#b09270]">
                        <p>
                            <span className="font-semibold text-[#f5e7d8]">
                                {nft.name}
                            </span>{" "}
                            faz parte da coleção{" "}
                            <span className="text-[#f5e7d8]">
                                {nft.collection}
                            </span>
                            , criada por {nft.creator}.
                        </p>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <h3 className="font-semibold text-[#f5e7d8]">
                                    Informações do token
                                </h3>

                                <p>Identificador: #{nft.id}</p>
                                <p>Categoria: {nft.category}</p>
                                <p>Coleção: {nft.collection}</p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-[#f5e7d8]">
                                    Informações de venda
                                </h3>

                                <p>
                                    Preço de referência:{" "}
                                    {nft.priceEth} ETH
                                </p>

                                <p>
                                    Disponibilidade:{" "}
                                    {nft.available} unidades
                                </p>

                                {nft.editions && (
                                    <p>
                                        Edições disponíveis:{" "}
                                        {nft.editions.length}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-[#4a3328] bg-[#261711] px-6 py-10 text-center">
                        <h3 className="text-lg font-semibold text-[#f5e7d8]">
                            Avaliações de colecionadores
                        </h3>

                        <p className="mt-3 text-sm text-[#b09270]">
                            Ainda não há avaliações disponíveis
                            para este NFT.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}