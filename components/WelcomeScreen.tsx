/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef } from 'react';
import UploadCloudIcon from './icons/UploadCloudIcon';
import TrashIcon from './icons/TrashIcon';
import { BrandingConfig } from '../types';

interface WelcomeScreenProps {
    onUpload: () => Promise<void>;
    apiKeyError: string | null;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    isApiKeySelected: boolean;
    onSelectKey: () => Promise<void>;
    onEnterManualKey: () => void;
    branding: BrandingConfig;
    setBranding: React.Dispatch<React.SetStateAction<BrandingConfig>>;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    onUpload, 
    apiKeyError, 
    files, 
    setFiles, 
    isApiKeySelected, 
    onSelectKey, 
    onEnterManualKey,
    branding,
    setBranding
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

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
    }, [setFiles]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isDragging) setIsDragging(true);
    }, [isDragging]);
    
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleConfirmUpload = async () => {
        try {
            await onUpload();
        } catch (error) {
            console.error("Upload process failed:", error);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleSelectKeyClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        await onSelectKey();
    };

    // Branding Handlers
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBranding(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setBranding(prev => ({ ...prev, logoUrl: null }));
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    const handleChangeColor = (field: 'primaryColor' | 'backgroundColor', value: string) => {
        setBranding(prev => ({ ...prev, [field]: value }));
    };

    const handleChangeText = (field: 'appTitle' | 'appSubtitle' | 'browserTitle', value: string) => {
        setBranding(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 relative">
            
            {/* Branding Settings Button */}
            <button 
                onClick={() => setIsConfigOpen(true)}
                className="absolute top-4 right-4 p-2 text-gem-offwhite/50 hover:text-gem-blue transition-colors"
                title="Configuración de marca"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {/* Branding Modal */}
            {isConfigOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setIsConfigOpen(false)}>
                    <div className="bg-gem-slate p-6 rounded-lg shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4 text-gem-offwhite">Personalizar Apariencia</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gem-offwhite/80 mb-1">Título de la Web (Pestaña)</label>
                                <input 
                                    type="text" 
                                    value={branding.browserTitle} 
                                    onChange={(e) => handleChangeText('browserTitle', e.target.value)}
                                    className="w-full bg-gem-mist/50 border border-gem-mist rounded px-3 py-2 text-gem-offwhite"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gem-offwhite/80 mb-1">Título Principal</label>
                                <input 
                                    type="text" 
                                    value={branding.appTitle} 
                                    onChange={(e) => handleChangeText('appTitle', e.target.value)}
                                    className="w-full bg-gem-mist/50 border border-gem-mist rounded px-3 py-2 text-gem-offwhite"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gem-offwhite/80 mb-1">Subtítulo</label>
                                <input 
                                    type="text" 
                                    value={branding.appSubtitle} 
                                    onChange={(e) => handleChangeText('appSubtitle', e.target.value)}
                                    className="w-full bg-gem-mist/50 border border-gem-mist rounded px-3 py-2 text-gem-offwhite"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gem-offwhite/80 mb-1">Logo (AEI)</label>
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        ref={logoInputRef}
                                        onChange={handleLogoUpload}
                                        className="text-sm text-gem-offwhite file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gem-blue file:text-white hover:file:bg-blue-500"
                                    />
                                    {branding.logoUrl && (
                                        <button onClick={handleRemoveLogo} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gem-offwhite/80 mb-1">Color Principal</label>
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="color" 
                                            value={branding.primaryColor} 
                                            onChange={(e) => handleChangeColor('primaryColor', e.target.value)}
                                            className="h-8 w-14 cursor-pointer border rounded"
                                        />
                                        <span className="text-xs text-gem-offwhite/60">{branding.primaryColor}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gem-offwhite/80 mb-1">Color de Fondo</label>
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="color" 
                                            value={branding.backgroundColor} 
                                            onChange={(e) => handleChangeColor('backgroundColor', e.target.value)}
                                            className="h-8 w-14 cursor-pointer border rounded"
                                        />
                                        <span className="text-xs text-gem-offwhite/60">{branding.backgroundColor}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 bg-gem-blue text-white rounded-md hover:bg-opacity-90">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-3xl text-center">
                {branding.logoUrl && (
                    <div className="mb-6 flex justify-center">
                        <img src={branding.logoUrl} alt="Logo" className="h-24 object-contain" />
                    </div>
                )}
                
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">{branding.appTitle}</h1>
                <p className="text-gem-offwhite/70 mb-8 font-semibold text-xl">
                    {branding.appSubtitle}
                </p>

                <div className="w-full max-w-xl mx-auto mb-8">
                     {!isApiKeySelected ? (
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleSelectKeyClick}
                                className="w-full bg-gem-blue hover:bg-blue-500 text-white font-semibold rounded-lg py-3 px-5 text-center focus:outline-none focus:ring-2 focus:ring-gem-blue"
                            >
                                Selecciona tu clave API de Gemini
                            </button>
                            <button
                                onClick={onEnterManualKey}
                                className="text-sm text-gem-blue hover:text-blue-400 underline mt-2"
                            >
                                O ingresa tu clave API manualmente
                            </button>
                        </div>
                    ) : (
                        <div className="w-full bg-gem-slate border border-gem-mist/50 rounded-lg py-3 px-5 text-center text-gem-teal font-semibold flex justify-between items-center">
                            <span>✓ Clave API Seleccionada</span>
                            <button onClick={onEnterManualKey} className="text-xs text-gem-offwhite/50 hover:text-gem-blue underline">Cambiar</button>
                        </div>
                    )}
                     {apiKeyError && <p className="text-red-500 text-sm mt-2">{apiKeyError}</p>}
                </div>

                <div 
                    className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors mb-6 ${isDragging ? 'border-gem-blue bg-gem-mist/10' : 'border-gem-mist/50'}`}
                    onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                >
                    <div className="flex flex-col items-center justify-center">
                        <UploadCloudIcon />
                        <p className="mt-4 text-lg text-gem-offwhite/80">Arrastra y suelta tu PDF, .txt o archivo .md aquí.</p>
                        <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.md"/>
                         <label 
                            htmlFor="file-upload" 
                            className="mt-4 cursor-pointer px-6 py-2 bg-gem-blue text-white rounded-full font-semibold hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gem-onyx focus:ring-gem-blue" 
                            title="Seleccionar archivos de tu dispositivo"
                            tabIndex={0}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    (document.getElementById('file-upload') as HTMLInputElement)?.click();
                                }
                            }}
                         >
                            O Buscar Archivos
                        </label>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="w-full max-w-xl mx-auto mb-6 text-left">
                        <h4 className="font-semibold mb-2">Archivos Seleccionados ({files.length}):</h4>
                        <ul className="max-h-36 overflow-y-auto space-y-1 pr-2">
                            {files.map((file, index) => (
                                <li key={`${file.name}-${index}`} className="text-sm bg-gem-mist/50 p-2 rounded-md flex justify-between items-center group">
                                    <span className="truncate" title={file.name}>{file.name}</span>
                                    <div className="flex items-center flex-shrink-0">
                                        <span className="text-xs text-gem-offwhite/50 ml-2">{(file.size / 1024).toFixed(2)} KB</span>
                                        <button 
                                            onClick={() => handleRemoveFile(index)}
                                            className="ml-2 p-1 text-red-400 hover:text-red-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label={`Eliminar ${file.name}`}
                                            title="Eliminar este archivo"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="w-full max-w-xl mx-auto">
                    {files.length > 0 && (
                        <button 
                            onClick={handleConfirmUpload}
                            disabled={!isApiKeySelected}
                            className="w-full px-6 py-3 rounded-md bg-gem-blue hover:bg-blue-500 text-white font-bold transition-colors disabled:bg-gem-mist/50 disabled:cursor-not-allowed"
                            title={!isApiKeySelected ? "Por favor selecciona una clave API primero" : "Iniciar sesión de chat con los archivos seleccionados"}
                        >
                            Subir y Chatear
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;