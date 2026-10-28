import { useState } from "react";
import { Maximize2 } from "lucide-react";
import type { NFT } from "../api/nfts";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "./ui/dialog";

interface NFTGalleryProps {
    nft: NFT;
}

export function NFTGallery({ nft }: NFTGalleryProps) {
    const images = nft.images?.length
        ? nft.images
        : [nft.image];

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isZoomOpen, setIsZoomOpen] = useState(false);

    const activeImage = images[selectedIndex] ?? images[0];

    return (
        <>
            <section
                aria-label={`Galeria de imagens de ${nft.name}`}
                className="flex flex-col-reverse gap-4 sm:flex-row"
            >
                {/* MINIATURAS */}
                <div className="flex gap-3 sm:w-20 sm:flex-col">
                    {images.map((image, index) => (
                        <button
                            key={`${image}-${index}`}
                            type="button"
                            aria-label={`Visualizar imagem ${index + 1} de ${nft.name}`}
                            aria-pressed={selectedIndex === index}
                            onClick={() => setSelectedIndex(index)}
                            className={[
                                "aspect-square w-20 overflow-hidden rounded-lg border-2 transition",
                                selectedIndex === index
                                    ? "border-[#d8904c]"
                                    : "border-transparent hover:border-[#806858]",
                            ].join(" ")}
                        >
                            <img
                                src={image}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>

                {/* IMAGEM PRINCIPAL */}
                <div className="relative min-w-0 flex-1 rounded-xl bg-[#261711] p-4">
                    <img
                        src={activeImage}
                        alt={`Imagem ${selectedIndex + 1} de ${nft.name}`}
                        className="aspect-square w-full rounded-lg object-cover"
                    />

                    <button
                        type="button"
                        aria-label="Ampliar imagem"
                        onClick={() => setIsZoomOpen(true)}
                        className="absolute right-7 top-7 rounded-full bg-[#140e0b]/80 p-3 text-white transition hover:bg-[#d8904c] hover:text-[#140e0b]"
                    >
                        <Maximize2 size={20} />
                    </button>
                </div>
            </section>

            {/* VISUALIZAÇÃO AMPLIADA */}
            <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
                <DialogContent className="max-h-[95vh] max-w-5xl border-[#4a3328] bg-[#140e0b] p-6 text-white">
                    <DialogTitle>
                        {nft.name}
                    </DialogTitle>

                    <DialogDescription className="text-[#b09270]">
                        Imagem {selectedIndex + 1} de {images.length}
                    </DialogDescription>

                    <img
                        src={activeImage}
                        alt={`Imagem ampliada de ${nft.name}`}
                        className="mx-auto max-h-[75vh] w-full rounded-lg object-contain"
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}