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
                    .label-preview-container {
                        display: block; /* Stack labels vertically */
                    }

                    @page {
                        /* Let the user define paper size and margins in the print dialog */
                        size: auto;
                        margin: 0mm;
                    }

                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    .label {
                        width: 100%; /* Fill the width of the label paper */
                        height: auto;
                        /* The aspect-ratio from screen styles will maintain the square shape */
                        page-break-inside: avoid; /* Prevent a label from splitting across pages */
                        border: none; /* No border for the actual print */
                    }
                }
            `}</style>
        </>
    );
};

export default PrintableSingleLabelSheet;