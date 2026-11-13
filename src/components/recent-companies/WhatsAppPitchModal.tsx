"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Copy, Check, ExternalLink, X, Zap, BookmarkCheck, Calendar, Clock } from "lucide-react";
import { RecentCompanyLead, SentMessageRecord, MessageStatus } from "@/types/recentCompanies";
import { recordSentMessage } from "@/lib/recentMessagesStorage";

interface WhatsAppPitchModalProps {
  company: RecentCompanyLead | null;
  onClose: () => void;
  existingSentRecord?: SentMessageRecord | null;
  onMessageSent?: (record: SentMessageRecord) => void;
}

const STATUS_OPTIONS: Array<{ value: MessageStatus; label: string }> = [
  { value: "enviada", label: "Enviada" },
  { value: "aguardando", label: "Aguardando Resposta" },
  { value: "respondeu", label: "Respondeu" },
  { value: "reuniao_agendada", label: "Reunião Agendada" },
  { value: "fechou", label: "Fechou Contrato" },
  { value: "recusou", label: "Sem Interesse" },
];

export default function WhatsAppPitchModal({ 
  company, 
  onClose,
  existingSentRecord,
  onMessageSent,
}: WhatsAppPitchModalProps) {
  if (!company) return null;

  const [copied, setCopied] = useState(false);
  const [customText, setCustomText] = useState(company.pitchAbordagemSugerido.mensagemWhatsapp);
  const [selectedStatus, setSelectedStatus] = useState<MessageStatus>(
    existingSentRecord?.status || "enviada"
  );
  const [observacoes, setObservacoes] = useState(existingSentRecord?.observacoes || "");
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCustomText(company.pitchAbordagemSugerido.mensagemWhatsapp);
    setSelectedStatus(existingSentRecord?.status || "enviada");
    setObservacoes(existingSentRecord?.observacoes || "");
    setSavedFeedback(null);
  }, [company, existingSentRecord]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveOnly = async () => {
    setIsSaving(true);
    const rec = await recordSentMessage(company, customText, selectedStatus, observacoes);
    setIsSaving(false);
    if (onMessageSent) onMessageSent(rec);
    setSavedFeedback("✓ Empresa salva na lista de mensagens enviadas!");
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  const handleOpenWhatsApp = async () => {
    // Registra imediatamente
    const rec = await recordSentMessage(company, customText, selectedStatus, observacoes);
    if (onMessageSent) onMessageSent(rec);
    setSavedFeedback("✓ Contato registrado com sucesso!");

    // Abre o WhatsApp
    const cleanPhone = company.contato.telefoneWhatsapp.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(customText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto glass-panel bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Header do Modal */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Script de Abordagem WhatsApp — Empresa Recente
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calibrado para o momento da empresa: <strong className="text-slate-700 dark:text-slate-300">Criada há {company.diasCriacao} dias</strong> ({company.bairroRegiao})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerta se Já Foi Contatada */}
        {existingSentRecord && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Empresa já contatada:</strong> Enviada em {formatDateTime(existingSentRecord.enviadoEm)}
                {existingSentRecord.observacoes && (
                  <span className="block text-[11px] opacity-90 mt-0.5">
                    Nota: "{existingSentRecord.observacoes}"
                  </span>
                )}
              </span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 capitalize shrink-0">
              {existingSentRecord.status}
            </span>
          </div>
        )}

        {/* Resumo do Decisor & Lead */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200/60 dark:border-white/[0.04] text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Decisor (Sócio):</span>
            <strong className="text-slate-900 dark:text-white">{company.socioPrincipal.nome}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">WhatsApp Direto:</span>
            <strong className="text-slate-900 dark:text-white font-mono">{company.contato.telefoneFormatado}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Gatilho de Entrada:</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <Zap className="w-3 h-3" /> {company.pitchAbordagemSugerido.gatilhoPsicologico}
            </span>
          </div>
        </div>

        {/* Área de Edição do Pitch */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Mensagem Pronta para Envio:
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {customText.length} caracteres
            </span>
          </div>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={5}
            className="w-full p-3.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 leading-relaxed font-sans resize-none"
          />
        </div>

        {/* Configurações de Registro: Status e Observações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Status da Abordagem:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as MessageStatus)}
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Anotação / Observação (opcional):
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Pediu para retornar na sexta às 10h"
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Feedback de salvamento */}
        {savedFeedback && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
            {savedFeedback}
          </div>
        )}

        {/* Dica de Venda */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <strong>💡 Dica do Analista de Mercado:</strong> Como a empresa abriu há apenas {company.diasCriacao} dias, o sócio ainda está diretamente envolvido na operação e não tem recepcionista bloqueando. A abordagem focada em parabenizar pela inauguração e oferecer alívio imediato no fechamento de caixa/pedidos costuma ter mais de 40% de taxa de resposta.
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            <button
              onClick={handleSaveOnly}
              disabled={isSaving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 transition cursor-pointer"
              title="Registrar esta empresa como já contatada sem abrir o WhatsApp"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Salvar Envio</span>
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm cursor-pointer"
              title="Abre a conversa no WhatsApp Web ou App e salva o registro automaticamente"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Salvar e Abrir WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
