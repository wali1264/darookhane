import React from 'react';
import { Drug } from '../types';
import QRCodeSVG from './QRCodeSVG';

interface PrintableSingleLabelSheetProps {
    drug: Drug;
    count: number;
}

const PrintableSingleLabelSheet: React.FC<PrintableSingleLabelSheetProps> = ({ drug, count }) => {
    return (
        <>
            {/* This container is for screen preview and printing. */}
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
                    box-sizing: border-box;
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
                    /* Reset container styles for printing */
                    .label-preview-container {
                        display: block;
                    }

                    /* General page setup for printing */
                    @page {
                        /* User should set the actual paper size in the print dialog. 
                           We suggest minimal margins. */
                        margin: 2mm;
                    }

                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    /* Critical: Style each label as a separate print page */
                    .label {
                        width: 5cm;   /* Define a fixed, logical size */
                        height: 5cm;
                        padding: 0;
                        border: none;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        
                        /* Force each label onto a new page */
                        page-break-after: always;
                        page-break-inside: avoid;
                    }

                    /* Prevent the very last label from creating an extra blank page */
                    .label-preview-container > .label:last-child {
                        page-break-after: auto;
                    }

                    .label-qrcode-wrapper {
                        width: 100%;
                        height: 100%;
                    }
                    
                    .label-qrcode-wrapper svg {
                        width: 95%;
                        height: 95%;
                        object-fit: contain;
                    }
                }
            `}</style>
        </>
    );
};

export default PrintableSingleLabelSheet;
