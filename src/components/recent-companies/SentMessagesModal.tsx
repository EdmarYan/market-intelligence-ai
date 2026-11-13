"use client";

import React, { useState, useMemo } from "react";
import { 
  MessageSquare, 
  X, 
  Search, 
  Download, 
  ExternalLink, 
  Trash2, 
  Check, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  Sparkles,
  Calendar,
  FileText
} from "lucide-react";
import { SentMessageRecord, MessageStatus } from "@/types/recentCompanies";
import { updateSentMessageStatus, deleteSentMessage } from "@/lib/recentMessagesStorage";

interface SentMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentMessages: SentMessageRecord[];
  onRefresh: () => void;
}

const STATUS_LABELS: Record<MessageStatus, { label: string; color: string; bg: string }> = {
  enviada: { label: "Enviada", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
  aguardando: { label: "Aguardando", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
  respondeu: { label: "Respondeu", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" },
  reuniao_agendada: { label: "Reunião Agendada", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20" },
  fechou: { label: "Fechou Contrato", color: "text-green-700 dark:text-green-300", bg: "bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/30" },
  recusou: { label: "Sem Interesse", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" },
};

export default function SentMessagesModal({
  isOpen,
  onClose,
  sentMessages,
  onRefresh,
}: SentMessagesModalProps) {
  if (!isOpen) return null;

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [viewingMessage, setViewingMessage] = useState<SentMessageRecord | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Filtro
  const filtered = useMemo(() => {
    return sentMessages.filter((item) => {
      if (selectedStatus !== "todos" && item.status !== selectedStatus) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          item.nomeFantasia.toLowerCase().includes(q) ||
          item.razaoSocial.toLowerCase().includes(q) ||
          item.cnpj.includes(q) ||
          item.socioNome.toLowerCase().includes(q) ||
          item.bairroRegiao.toLowerCase().includes(q) ||
          item.telefoneFormatado.includes(q) ||
          (item.observacoes && item.observacoes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [sentMessages, selectedStatus, search]);

  // Contadores por status
  const stats = useMemo(() => {
    return {
      total: sentMessages.length,
      respondeu: sentMessages.filter((s) => s.status === "respondeu").length,
      reuniao: sentMessages.filter((s) => s.status === "reuniao_agendada").length,
      fechou: sentMessages.filter((s) => s.status === "fechou").length,
    };
  }, [sentMessages]);

  const handleStatusChange = async (record: SentMessageRecord, newStatus: MessageStatus) => {
    await updateSentMessageStatus(record.companyId, newStatus);
    onRefresh();
    setActionFeedback(`Status de "${record.nomeFantasia}" alterado para ${STATUS_LABELS[newStatus]?.label || newStatus}.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleSaveNote = async (record: SentMessageRecord) => {
    await updateSentMessageStatus(record.companyId, record.status, noteDraft);
    setEditingNoteId(null);
    onRefresh();
    setActionFeedback(`Observação salva com sucesso.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleDelete = async (record: SentMessageRecord) => {
    if (!confirm(`Deseja remover o registro de contato com "${record.nomeFantasia}"?`)) {
      return;
    }
    await deleteSentMessage(record.companyId);
    onRefresh();
    setActionFeedback(`Registro de "${record.nomeFantasia}" excluído.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleExportCsv = () => {
    if (sentMessages.length === 0) return;

    const headers = [
      "Data Envio",
      "CNPJ",
      "Nome Fantasia",
      "Razão Social",
      "Bairro/Região",
      "Endereço Completo",
      "Sócio Decisor",
      "Telefone WhatsApp",
      "Status",
      "Observações",
      "Mensagem Enviada",
    ];

    const rows = filtered.map((item) => [
      `"${new Date(item.enviadoEm).toLocaleString("pt-BR")}"`,
      `"${item.cnpj}"`,
      `"${item.nomeFantasia.replace(/"/g, '""')}"`,
      `"${item.razaoSocial.replace(/"/g, '""')}"`,
      `"${item.bairroRegiao.replace(/"/g, '""')}"`,
      `"${item.enderecoCompleto.replace(/"/g, '""')}"`,
      `"${item.socioNome.replace(/"/g, '""')}"`,
      `"${item.telefoneFormatado}"`,
      `"${STATUS_LABELS[item.status]?.label || item.status}"`,
      `"${(item.observacoes || "").replace(/"/g, '""')}"`,
      `"${item.mensagem.replace(/"/g, '""').replace(/\n/g, " ")}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `empresas_contatadas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col glass-panel bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/[0.08] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Locais & Empresas Contatadas no WhatsApp
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controle central de todos os comércios que já receberam mensagem, com status de negociação e anotações.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resumo Rápido em Cards */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-200/60 dark:border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <span className="text-slate-500">Total Abordados:</span>
            <strong className="font-mono text-base text-slate-900 dark:text-white">{stats.total}</strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Respostas:</span>
            <strong className="font-mono text-base text-emerald-600 dark:text-emerald-400">{stats.respondeu}</strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <span className="text-purple-600 dark:text-purple-400 font-medium">Reuniões:</span>
            <strong className="font-mono text-base text-purple-600 dark:text-purple-400">{stats.reuniao}</strong>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <span className="text-green-600 dark:text-green-400 font-medium">Contratos:</span>
            <strong className="font-mono text-base text-green-600 dark:text-green-400">{stats.fechou}</strong>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por empresa, sócio ou bairro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedStatus("todos")}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedStatus === "todos"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs"
                  : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Todos ({sentMessages.length})
            </button>
            {(Object.keys(STATUS_LABELS) as MessageStatus[]).map((st) => {
              const count = sentMessages.filter((s) => s.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                    selectedStatus === st
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  <span>{STATUS_LABELS[st].label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Temporário */}
        {actionFeedback && (
          <div className="px-5 py-2 text-xs font-medium bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            {actionFeedback}
          </div>
        )}

        {/* Lista / Tabela de Contatados */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Nenhum local contatado encontrado
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {sentMessages.length === 0
                  ? "Ao abrir scripts de abordagem e clicar em 'Abrir no WhatsApp', as empresas serão salvas automaticamente nesta lista."
                  : "Nenhuma empresa corresponde ao filtro ou busca selecionada."}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const cleanPhone = item.telefoneWhatsapp.replace(/[^0-9]/g, "");
              const isEditingThisNote = editingNoteId === item.companyId;

              return (
                <div
                  key={item.id || item.companyId}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-emerald-500/30 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.nomeFantasia}
                        </h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400">
                          {item.cnpj}
                        </span>
                        {item.bairroRegiao && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                            {item.bairroRegiao}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.razaoSocial}
                      </p>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value as MessageStatus)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border focus:outline-none cursor-pointer ${
                          STATUS_LABELS[item.status]?.bg || ""
                        } ${STATUS_LABELS[item.status]?.color || ""}`}
                      >
                        {(Object.keys(STATUS_LABELS) as MessageStatus[]).map((st) => (
                          <option key={st} value={st} className="bg-white dark:bg-[#12141c] text-slate-800 dark:text-white">
                            {STATUS_LABELS[st].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Informações de Contato e Horário */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-slate-200/50 dark:border-white/[0.03]">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Sócio: <strong>{item.socioNome}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.telefoneFormatado}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Enviado: {formatDateTime(item.enviadoEm)}</span>
                    </div>
                  </div>

                  {/* Campo de Observações do Contato */}
                  <div className="text-xs space-y-1">
                    {isEditingThisNote ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Ex: Pediu para ligar amanhã às 14h / Gostou da proposta..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveNote(item)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                        <span className="italic">
                          {item.observacoes ? (
                            <span>💬 {item.observacoes}</span>
                          ) : (
                            <span className="text-slate-400">+ Adicionar observação / retorno do cliente...</span>
                          )}
                        </span>
                        <button
                          onClick={() => {
                            setEditingNoteId(item.companyId);
                            setNoteDraft(item.observacoes || "");
                          }}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                        >
                          {item.observacoes ? "Editar nota" : "Adicionar nota"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Barra Inferior com Ações Rápidas */}
                  <div className="pt-2 border-t border-slate-200/50 dark:border-white/[0.04] flex items-center justify-between text-xs">
                    <button
                      onClick={() => setViewingMessage(item)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver script enviado</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(item.mensagem || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                        title="Remover do histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Secundário: Ver Script Enviado */}
        {viewingMessage && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-5 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/[0.08]">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Script enviado para {viewingMessage.nomeFantasia}
                </h4>
                <button
                  onClick={() => setViewingMessage(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/[0.04] text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                {viewingMessage.mensagem}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setViewingMessage(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
