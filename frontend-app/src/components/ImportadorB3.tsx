import React, { useState } from 'react';
import { Upload, CloudArrowUp, CheckCircle, XCircle } from 'phosphor-react';

const ImportadorB3: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validação básica de extensão
        if (!file.name.endsWith('.xlsx')) {
            setStatus('error');
            setMessage('Por favor, selecione um arquivo .xlsx válido.');
            return;
        }

        const formData = new FormData();
        formData.append('planilha', file);

        setStatus('uploading');

        try {
            // URL aponta para o seu novo endpoint no Backend
            const response = await fetch('http://localhost:3001/api/admin/importar-b3', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Dados processados com sucesso!');
            } else {
                throw new Error(data.error || 'Erro ao processar arquivo no servidor');
            }
        } catch (error: any) {
            console.error('[UPLOAD ERROR]:', error);
            setStatus('error');
            setMessage(error.message || 'Erro de conexão com o servidor');
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <CloudArrowUp size={28} className="text-[#38bdf8]" />
                    Sincronização de Base de Dados (B3)
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                    Atualize os prêmios, strikes e tickers diretamente do arquivo extraído da B3.
                </p>
            </div>

            <label className={`
                relative group cursor-pointer border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all duration-300
                ${status === 'idle' ? 'border-[#334155] bg-[#0f172a] hover:border-[#38bdf8] hover:bg-[#38bdf8]/5' : ''}
                ${status === 'uploading' ? 'border-yellow-500 bg-yellow-500/10 cursor-wait' : ''}
                ${status === 'success' ? 'border-green-500 bg-green-500/10' : ''}
                ${status === 'error' ? 'border-red-500 bg-red-500/10' : ''}
            `}>
                <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                    accept=".xlsx" 
                    disabled={status === 'uploading'}
                />
                
                {status === 'idle' && (
                    <>
                        <Upload size={56} className="text-gray-500 group-hover:text-[#38bdf8] mb-4 transition-colors" />
                        <p className="text-gray-300 text-center font-medium">
                            Clique para selecionar ou arraste o arquivo <br />
                            <span className="text-[#38bdf8] text-sm font-bold">Opções.xlsx</span>
                        </p>
                    </>
                )}

                {status === 'uploading' && (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#334155] border-t-yellow-500 mb-4"></div>
                        <p className="text-yellow-500 font-bold tracking-wider">PROCESSANDO MOTOR DE DADOS...</p>
                        <span className="text-xs text-yellow-500/70 mt-1 italic">Não feche esta aba</span>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center text-green-400 animate-in zoom-in duration-300">
                        <CheckCircle size={64} weight="fill" className="mb-4" />
                        <p className="font-bold text-lg">Banco de Dados Atualizado!</p>
                        <p className="text-sm opacity-80 mb-4">{message}</p>
                        <button 
                            onClick={(e) => { e.preventDefault(); setStatus('idle'); }} 
                            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-xs font-bold transition-colors"
                        >
                            SUBIR NOVO ARQUIVO
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center text-red-400 animate-in shake duration-300">
                        <XCircle size={64} weight="fill" className="mb-4" />
                        <p className="font-bold text-lg">Falha na Importação</p>
                        <p className="text-sm opacity-80 mb-4 text-center">{message}</p>
                        <button 
                            onClick={(e) => { e.preventDefault(); setStatus('idle'); }} 
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-xs font-bold transition-colors text-white"
                        >
                            TENTAR NOVAMENTE
                        </button>
                    </div>
                )}
            </label>

            <div className="mt-6 flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                <span>Status do Motor: {status === 'uploading' ? 'Ocupado' : 'Pronto'}</span>
                <span>Conexão: Localhost:3001</span>
            </div>
        </div>
    );
};

export default ImportadorB3;