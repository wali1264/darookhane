import React from 'react';
import { Drug } from '../types';
import BarcodeSVG from './BarcodeSVG';

interface PrintableSingleLabelSheetProps {
    drug: Drug;
    count: number;
    widthCm: number;
    heightCm: number;
}

const PrintableSingleLabelSheet: React.FC<PrintableSingleLabelSheetProps> = ({ drug, count, widthCm, heightCm }) => {
    return (
        <>
            <div className="label-sheet">
                {Array.from({ length: count }).map((_, index) => (
                    <div key={index} className="label" style={{ width: `${widthCm}cm`, height: `${heightCm}cm` }}>
                        <div className="label-barcode-wrapper">
                            {drug.internalBarcode && <BarcodeSVG value={drug.internalBarcode} />}
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                .label-sheet {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(${widthCm}cm, 1fr));
                    gap: 0.2cm;
                }
                .label {
                    border: 1px dashed #ccc;
                    padding: 0.2cm; /* Provides a small quiet zone */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    page-break-inside: avoid;
                    overflow: hidden;
                    background-color: white;
                }
                .label-barcode-wrapper {
                    width: 100%; /* Use full width */
                    height: 100%; /* Use full height */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                 .label-barcode-wrapper svg {
                    max-width: 100%;
                    max-height: 100%;
                }
                @media print {
                    .label-sheet {
                        grid-template-columns: repeat(auto-fill, ${widthCm}cm);
                    }
                }
            `}</style>
        </>
    );
};

export default PrintableSingleLabelSheet;
