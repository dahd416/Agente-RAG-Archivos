/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppStatus, ChatMessage, BrandingConfig } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import WelcomeScreen from './components/WelcomeScreen';
import ProgressBar from './components/ProgressBar';
import ChatInterface from './components/ChatInterface';
import ApiKeyModal from './components/ApiKeyModal';

// DO: Define the AIStudio interface to resolve a type conflict where `window.aistudio` was being redeclared with an anonymous type.
// FIX: Moved the AIStudio interface definition inside the `declare global` block to resolve a TypeScript type conflict.
declare global {
    interface AIStudio {
        openSelectKey: () => Promise<void>;
        hasSelectedApiKey: () => Promise<boolean>;
    }
    interface Window {
        aistudio?: AIStudio;
    }
}

const App: React.FC = () => {
    const [status, setStatus] = useState<AppStatus>(AppStatus.Initializing);
    const [isApiKeySelected, setIsApiKeySelected] = useState(false);
    const [manualApiKey, setManualApiKey] = useState<string | null>(null);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, message?: string, fileName?: string } | null>(null);
    const [activeRagStoreName, setActiveRagStoreName] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isQueryLoading, setIsQueryLoading] = useState(false);
    const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
    const [documentName, setDocumentName] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);
    
    // Branding State
    const [branding, setBranding] = useState<BrandingConfig>({
        appTitle: 'Chatea con tus Documentos',
        appSubtitle: 'Cotizador AEI',
        browserTitle: 'Gemini RAG - Gestor',
        logoUrl: null,
        primaryColor: '#2563eb', // gem-blue default
        backgroundColor: '#f8fafc', // gem-onyx default
    });

    const ragStoreNameRef = useRef(activeRagStoreName);

    useEffect(() => {
        ragStoreNameRef.current = activeRagStoreName;
    }, [activeRagStoreName]);

    // Update Document Title based on branding
    useEffect(() => {
        document.title = branding.browserTitle;
    }, [branding.browserTitle]);

    // Apply CSS Variables for dynamic colors
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--gem-blue', branding.primaryColor);
        root.style.setProperty('--gem-onyx', branding.backgroundColor);
    }, [branding.primaryColor, branding.backgroundColor]);
    
    const checkApiKey = useCallback(async () => {
        if (manualApiKey) {
            setIsApiKeySelected(true);
            return;
        }

        if (window.aistudio?.hasSelectedApiKey) {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsApiKeySelected(hasKey);
            } catch (e) {
                console.error("Error checking for API key:", e);
                setIsApiKeySelected(false); // Assume no key on error
            }
        }
    }, [manualApiKey]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            // This event fires when the user switches to or from the tab.
            if (document.visibilityState === 'visible') {
                checkApiKey();
            }
        };
        
        checkApiKey(); // Initial check when the component mounts.

        // Listen for visibility changes and window focus. This ensures that if the user
        // changes the API key in another tab (like the AI Studio settings),
        // the app's state will update automatically when they return to this tab.
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', checkApiKey);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', checkApiKey);
        };
    }, [checkApiKey]);

    useEffect(() => {
        const handleUnload = () => {
            if (ragStoreNameRef.current) {
                geminiService.deleteRagStore(ragStoreNameRef.current)
                    .catch(err => console.error("Error deleting RAG store on unload:", err));
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, []);


    const handleError = (message: string, err: any) => {
        console.error(message, err);
        setError(`${message}${err ? `: ${err instanceof Error ? err.message : String(err)}` : ''}`);
        setStatus(AppStatus.Error);
    };

    const clearError = () => {
        setError(null);
        setStatus(AppStatus.Welcome);
    }

    useEffect(() => {
        setStatus(AppStatus.Welcome);
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio?.openSelectKey) {
            try {
                await window.aistudio.openSelectKey();
                await checkApiKey(); // Check right after the dialog promise resolves
            } catch (err) {
                console.error("Failed to open API key selection dialog", err);
            }
        } else {
            console.log('window.aistudio.openSelectKey() not available.');
            // Fallback to manual input if AI Studio is not available
            setShowApiKeyModal(true);
        }
    };

    const handleSaveManualKey = (key: string) => {
        setManualApiKey(key);
        setApiKeyError(null);
        setIsApiKeySelected(true);
    };

    const handleUploadAndStartChat = async () => {
        if (!isApiKeySelected) {
            setApiKeyError("Por favor, selecciona tu clave API de Gemini primero.");
            throw new Error("Se requiere clave API.");
        }
        if (files.length === 0) return;
        
        setApiKeyError(null);

        try {
            geminiService.initialize(manualApiKey || undefined);
        } catch (err) {
            handleError("Fallo en la inicialización. Por favor selecciona una clave API válida.", err);
            throw err;
        }
        
        setStatus(AppStatus.Uploading);
        const totalSteps = files.length + 2;
        setUploadProgress({ current: 0, total: totalSteps, message: "Creando índice de documentos..." });

        try {
            const storeName = `chat-session-${Date.now()}`;
            const ragStoreName = await geminiService.createRagStore(storeName);
            
            setUploadProgress({ current: 1, total: totalSteps, message: "Generando embeddings..." });

            for (let i = 0; i < files.length; i++) {
                setUploadProgress(prev => ({ 
                    ...(prev!),
                    current: i + 1,
                    message: "Generando embeddings...",
                    fileName: `(${i + 1}/${files.length}) ${files[i].name}`
                }));
                await geminiService.uploadToRagStore(ragStoreName, files[i]);
            }
            
            setUploadProgress({ current: files.length + 1, total: totalSteps, message: "Generando sugerencias...", fileName: "" });
            const questions = await geminiService.generateExampleQuestions(ragStoreName);
            setExampleQuestions(questions);

            setUploadProgress({ current: totalSteps, total: totalSteps, message: "¡Todo listo!", fileName: "" });
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Short delay to show "All set!"

            let docName = '';
            if (files.length === 1) {
                docName = files[0].name;
            } else if (files.length === 2) {
                docName = `${files[0].name} y ${files[1].name}`;
            } else {
                docName = `${files.length} documentos`;
            }
            setDocumentName(docName);

            setActiveRagStoreName(ragStoreName);
            setChatHistory([]);
            setStatus(AppStatus.Chatting);
            setFiles([]); // Clear files on success
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
            if (errorMessage.includes('api key not valid') || errorMessage.includes('requested entity was not found')) {
                setApiKeyError("La clave API seleccionada no es válida. Por favor selecciona una diferente e intenta de nuevo.");
                setIsApiKeySelected(false);
                setManualApiKey(null); // Reset manual key if invalid
                setStatus(AppStatus.Welcome);
            } else {
                handleError("Error al iniciar la sesión de chat", err);
            }
            throw err;
        } finally {
            setUploadProgress(null);
        }
    };

    const handleEndChat = () => {
        if (activeRagStoreName) {
            geminiService.deleteRagStore(activeRagStoreName).catch(err => {
                console.error("Failed to delete RAG store in background", err);
            });
        }
        setActiveRagStoreName(null);
        setChatHistory([]);
        setExampleQuestions([]);
        setDocumentName('');
        setFiles([]);
        setStatus(AppStatus.Welcome);
    };

    const handleSendMessage = async (message: string) => {
        if (!activeRagStoreName) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
        setChatHistory(prev => [...prev, userMessage]);
        setIsQueryLoading(true);

        try {
            const result = await geminiService.fileSearch(activeRagStoreName, message);
            const modelMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: result.text }],
                groundingChunks: result.groundingChunks
            };
            setChatHistory(prev => [...prev, modelMessage]);
        } catch (err) {
            const errorMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: "Lo siento, encontré un error. Por favor intenta de nuevo." }]
            };
            setChatHistory(prev => [...prev, errorMessage]);
            handleError("Error al obtener respuesta", err);
        } finally {
            setIsQueryLoading(false);
        }
    };
    
    const renderContent = () => {
        switch(status) {
            case AppStatus.Initializing:
                return (
                    <div className="flex items-center justify-center h-screen">
                        <Spinner /> <span className="ml-4 text-xl">Iniciando...</span>
                    </div>
                );
            case AppStatus.Welcome:
                 return (
                    <>
                        <WelcomeScreen 
                            onUpload={handleUploadAndStartChat} 
                            apiKeyError={apiKeyError} 
                            files={files} 
                            setFiles={setFiles} 
                            isApiKeySelected={isApiKeySelected} 
                            onSelectKey={handleSelectKey}
                            onEnterManualKey={() => setShowApiKeyModal(true)}
                            branding={branding}
                            setBranding={setBranding}
                        />
                        <ApiKeyModal 
                            isOpen={showApiKeyModal} 
                            onClose={() => setShowApiKeyModal(false)} 
                            onSave={handleSaveManualKey} 
                        />
                    </>
                 );
            case AppStatus.Uploading:
                let icon = null;
                if (uploadProgress?.message === "Creando índice de documentos...") {
                    icon = <img src="https://services.google.com/fh/files/misc/applet-upload.png" alt="Icono de subida" className="h-80 w-80 rounded-lg object-cover" />;
                } else if (uploadProgress?.message === "Generando embeddings...") {
                    icon = <img src="https://services.google.com/fh/files/misc/applet-creating-embeddings_2.png" alt="Icono de embeddings" className="h-240 w-240 rounded-lg object-cover" />;
                } else if (uploadProgress?.message === "Generando sugerencias...") {
                    icon = <img src="https://services.google.com/fh/files/misc/applet-suggestions_2.png" alt="Icono de sugerencias" className="h-240 w-240 rounded-lg object-cover" />;
                } else if (uploadProgress?.message === "¡Todo listo!") {
                    icon = <img src="https://services.google.com/fh/files/misc/applet-completion_2.png" alt="Icono de completado" className="h-240 w-240 rounded-lg object-cover" />;
                }

                return <ProgressBar 
                    progress={uploadProgress?.current || 0} 
                    total={uploadProgress?.total || 1} 
                    message={uploadProgress?.message || "Preparando tu chat..."} 
                    fileName={uploadProgress?.fileName}
                    icon={icon}
                />;
            case AppStatus.Chatting:
                return <ChatInterface 
                    documentName={documentName}
                    history={chatHistory}
                    isQueryLoading={isQueryLoading}
                    onSendMessage={handleSendMessage}
                    onNewChat={handleEndChat}
                    exampleQuestions={exampleQuestions}
                />;
            case AppStatus.Error:
                 return (
                    <div className="flex flex-col items-center justify-center h-screen bg-red-900/20 text-red-300">
                        <h1 className="text-3xl font-bold mb-4">Error de Aplicación</h1>
                        <p className="max-w-md text-center mb-4">{error}</p>
                        <button onClick={clearError} className="px-4 py-2 rounded-md bg-gem-mist hover:bg-gem-mist/70 transition-colors" title="Volver a la pantalla de bienvenida">
                           Intentar de Nuevo
                        </button>
                    </div>
                );
            default:
                 return <WelcomeScreen 
                            onUpload={handleUploadAndStartChat} 
                            apiKeyError={apiKeyError} 
                            files={files} 
                            setFiles={setFiles} 
                            isApiKeySelected={isApiKeySelected} 
                            onSelectKey={handleSelectKey}
                            onEnterManualKey={() => setShowApiKeyModal(true)}
                            branding={branding}
                            setBranding={setBranding}
                        />;
        }
    }

    return (
        <main className="h-screen bg-gem-onyx text-gem-offwhite">
            {renderContent()}
        </main>
    );
};

export default App;