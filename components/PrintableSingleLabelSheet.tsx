import React from 'react';
import { Drug } from '../types';
import QRCodeSVG from './QRCodeSVG'; // Changed from BarcodeSVG to QRCodeSVG

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
                        <div className="label-qrcode-wrapper">
                            {drug.internalBarcode && <QRCodeSVG value={drug.internalBarcode} />}
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                /* For screen preview only */
                .label-preview-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(6cm, 1fr));
                    gap: 0.5cm;
                }
                .label {
                    border: 1px dashed #ccc;
                    padding: 0.2cm;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: white;
                    aspect-ratio: 1 / 1; /* Square aspect ratio for QR Code */
                }
                .label-qrcode-wrapper {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .label-qrcode-wrapper svg {
                    max-width: 90%;
                    max-height: 90%;
                }

                @media print {
                    /* This makes the container "disappear" for layout purposes, letting the labels be direct children
                       of the body for printing. This helps prevent the extra blank page at the end. */
                    .label-preview-container {
                        display: contents;
                    }

                    @page {
                        size: auto; /* Let the printer driver determine the page size */
                        margin: 0;
                    }

                    html, body {
                        width: 100%;
                        height: 100%;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    .label {
                        width: 100%; /* Switched from vw for better print compatibility */
                        height: 100%; /* Switched from vh */
                        border: none;
                        margin: 0;
                        padding: 0.2cm; /* Keep a small quiet zone */
                        box-sizing: border-box;
                        aspect-ratio: auto; /* Reset aspect ratio for printing on non-square pages */
                        /* This is the new page break strategy. A page break will happen AFTER each label.
                           Modern browsers are smart enough not to add a break after the very last one. */
                        page-break-after: always;
                    }
                }
            `}</style>
        </>
    );
};

export default PrintableSingleLabelSheet;