import React from 'react';
import { Drug } from '../types';
import BarcodeSVG from './BarcodeSVG';

interface PrintableSingleLabelSheetProps {
    drug: Drug;
    count: number;
}

const PrintableSingleLabelSheet: React.FC<PrintableSingleLabelSheetProps> = ({ drug, count }) => {
    return (
        <>
            {/* This container is for screen preview only. On print, each .label becomes its own page. */}
            <div className="label-preview-container">
                {Array.from({ length: count }).map((_, index) => (
                    <div key={index} className="label">
                        <div className="label-barcode-wrapper">
                            {drug.internalBarcode && <BarcodeSVG value={drug.internalBarcode} />}
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                /* For screen preview only */
                .label-preview-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(8cm, 1fr));
                    gap: 0.5cm;
                }
                .label {
                    border: 1px dashed #ccc;
                    padding: 0.2cm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: white;
                    aspect-ratio: 4 / 3; /* A fixed aspect ratio for preview */
                }
                .label-barcode-wrapper {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .label-barcode-wrapper svg {
                    max-width: 100%;
                    max-height: 100%;
                }

                @media print {
                    .label-preview-container {
                        display: block; /* Let labels flow naturally */
                    }

                    @page {
                        /* Size is inherited from user's printer settings. */
                        margin: 0;
                    }

                    /* Remove any body margin that might interfere */
                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    .label {
                        width: 100vw;
                        height: 100vh;
                        border: none;
                        margin: 0;
                        padding: 0.2cm; /* Keep a small quiet zone */
                        box-sizing: border-box;

                        /* Force each label onto a new page */
                        page-break-after: always;
                    }

                    /* This is the fix: Do not add a page break after the very last label */
                    .label:last-of-type {
                        page-break-after: auto;
                    }
                }
            `}</style>
        </>
    );
};

export default PrintableSingleLabelSheet;