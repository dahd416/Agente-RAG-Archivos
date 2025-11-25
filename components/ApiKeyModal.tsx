/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
    const [key, setKey] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            onSave(key.trim());
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-gem-slate p-6 rounded-lg shadow-xl w-full max-w-md border border-gem-mist">
                <h3 className="text-xl font-bold mb-4 text-gem-offwhite">Ingresar Clave API</h3>
                <p className="text-sm text-gem-offwhite/70 mb-4">
                    Ingresa tu clave API de Google Gemini. Esta clave solo se usará en esta sesión.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="Pegar clave API aquí..."
                        className="w-full bg-gem-mist border border-gem-mist/50 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-gem-blue mb-4 text-gem-offwhite"
                        autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md bg-gem-mist hover:bg-gem-mist/70 transition-colors text-gem-offwhite"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!key.trim()}
                            className="px-4 py-2 rounded-md bg-gem-blue hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
                <div className="mt-4 text-xs text-gem-offwhite/50 text-center">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-gem-blue">
                        Obtener clave API en Google AI Studio
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;