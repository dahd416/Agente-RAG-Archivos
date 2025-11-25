/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback } from 'react';
import UploadCloudIcon from './icons/UploadCloudIcon';
import CarIcon from './icons/CarIcon';
import WashingMachineIcon from './icons/WashingMachineIcon';
import Spinner from './Spinner';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
}

const sampleDocuments = [
    {
        name: 'Manual Hyundai i10',
        url: 'https://www.hyundai.com/content/dam/hyundai/in/en/data/connect-to-service/owners-manual/2025/i20&i20nlineFromOct2023-Present.pdf',
        icon: <CarIcon />,
        fileName: 'hyundai-i10-manual.pdf'
    },
    {
        name: 'Manual Lavadora LG',
        url: 'https://www.lg.com/us/support/products/documents/WM2077CW.pdf',
        icon: <WashingMachineIcon />,
        fileName: 'lg-washer-manual.pdf'
    }
];

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loadingSample, setLoadingSample] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleSelectSample = async (name: string, url: string, fileName: string) => {
        if (loadingSample) return;
        setLoadingSample(name);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${name}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });
            setFiles(prev => [...prev, file]);
        } catch (error) {
            console.error("Error fetching sample file:", error);
            alert(`No se pudo obtener el documento de ejemplo. Esto puede deberse a la política CORS. Por favor intenta subir un archivo local.`);
        } finally {
            setLoadingSample(null);
        }
    };

    const handleConfirmUpload = () => {
        onUpload(files);
        handleClose();
    };

    const handleClose = () => {
        setFiles([]);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <div className="bg-gem-slate p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 id="upload-title" className="text-2xl font-bold">Subir Documentos</h2>
                    <button onClick={handleClose} className="text-gem-offwhite/50 hover:text-gem-offwhite text-2xl">&times;</button>
                </div>

                <div 
                    className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors mb-6 ${isDragging ? 'border-gem-blue bg-gem-mist/10' : 'border-gem-mist/50'}`}
                    onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                >
                    <div className="flex flex-col items-center justify-center">
                        <UploadCloudIcon />
                        <p className="mt-4 text-lg text-gem-offwhite/80">Arrastra y suelta tus archivos aquí.</p>
                        <p className="text-sm text-gem-offwhite/50 mb-4">Soporta PDF, TXT, MD</p>
                        <input id="modal-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.md"/>
                         <label 
                            htmlFor="modal-file-upload" 
                            className="cursor-pointer px-6 py-2 bg-gem-blue text-white rounded-full font-semibold hover:bg-blue-500 transition-colors"
                         >
                            Buscar Archivos
                        </label>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="mb-6">
                        <h4 className="font-semibold mb-2">Seleccionados ({files.length}):</h4>
                        <ul className="max-h-32 overflow-y-auto space-y-1 pr-2 bg-gem-mist/30 p-2 rounded-md">
                            {files.map((file, index) => (
                                <li key={index} className="text-sm flex justify-between">
                                    <span className="truncate">{file.name}</span>
                                    <span className="text-gem-offwhite/50">{(file.size / 1024).toFixed(1)} KB</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mb-6">
                    <p className="text-sm font-semibold mb-2 text-gem-offwhite/70">O prueba con un ejemplo:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sampleDocuments.map(doc => (
                            <button
                                key={doc.name}
                                onClick={() => handleSelectSample(doc.name, doc.url, doc.fileName)}
                                disabled={!!loadingSample}
                                className="bg-gem-mist/20 p-3 rounded-lg border border-gem-mist/50 hover:border-gem-blue hover:bg-gem-mist/40 transition-all text-left flex items-center space-x-3"
                            >
                                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 bg-white rounded-full shadow-sm">
                                    {loadingSample === doc.name ? <Spinner /> : React.cloneElement(doc.icon as React.ReactElement<{ className?: string }>, { className: "h-6 w-6" })}
                                </div>
                                <span className="text-sm font-medium">{doc.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={handleClose}
                        className="px-6 py-2 rounded-md bg-gem-mist hover:bg-gem-mist/70 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmUpload}
                        disabled={files.length === 0}
                        className="px-6 py-2 rounded-md bg-gem-blue hover:bg-blue-500 text-white font-bold transition-colors disabled:bg-gem-mist/50 disabled:cursor-not-allowed"
                    >
                        Subir {files.length > 0 ? `(${files.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;