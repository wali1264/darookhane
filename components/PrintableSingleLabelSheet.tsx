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
                    align-items: center;
                    justify-content: center;
                }
                .label-qrcode-wrapper svg {
                    max-width: 90%;
                    max-height: 90%;
                }

                @media print {
                    /* Reset container for printing */
                    .label-preview-container {
                        display: block;
                        margin: 0;
                        padding: 0;
                    }

                    @page {
                        size: auto;  /* Let printer driver determine size */
                        margin: 5mm; /* A reasonable default margin */
                    }

                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        width: 100%;
                        height: 100%;
                    }

                    /* Make each label a full page */
                    .label {
                        width: 100%;
                        height: 100%;
                        padding: 0;
                        border: none;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-sizing: border-box;
                        
                        /* Standard page break logic */
                        page-break-inside: avoid;
                        page-break-before: always;
                    }
                    
                    /* CRITICAL: Prevent the very first label from creating a blank page */
                    .label-preview-container > .label:first-child {
                        page-break-before: auto;
                    }
                    
                    /* Ensure the last element doesn't cause an extra page */
                     .label-preview-container > .label:last-child {
                        page-break-after: auto;
                    }

                    .label-qrcode-wrapper {
                        width: 100%;
                        height: 100%;
                        padding: 2%; /* Add some padding so QR isn't touching edge */
                        box-sizing: border-box;
                    }
                    
                    .label-qrcode-wrapper svg {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    }
                }
            `}</style>
        </>
    );
};

export default PrintableSingleLabelSheet;
