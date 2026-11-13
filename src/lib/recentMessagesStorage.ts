import { SentMessageRecord, MessageStatus, RecentCompanyLead } from "@/types/recentCompanies";

const LOCAL_STORAGE_KEY = "market_ai_sent_messages_v1";

/**
 * Lê registros de mensagens enviadas do localStorage para exibição imediata
 */
export function getLocalSentMessages(): Record<string, SentMessageRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const list: SentMessageRecord[] = JSON.parse(raw);
    const map: Record<string, SentMessageRecord> = {};
    for (const item of list) {
      if (item.companyId) map[item.companyId] = item;
      if (item.cnpj) {
        const clean = item.cnpj.replace(/\D/g, "");
        if (clean) map[clean] = item;
      }
    }
    return map;
  } catch (e) {
    console.warn("Erro ao ler localStorage de mensagens enviadas:", e);
    return {};
  }
}

/**
 * Salva registro no localStorage
 */
export function saveLocalSentMessage(record: SentMessageRecord) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: SentMessageRecord[] = raw ? JSON.parse(raw) : [];
    
    // Substitui se já existir, ou adiciona no topo
    const index = list.findIndex(
      (item) =>
        (record.companyId && item.companyId === record.companyId) ||
        (record.cnpj && item.cnpj.replace(/\D/g, "") === record.cnpj.replace(/\D/g, ""))
    );

    if (index >= 0) {
      list[index] = record;
    } else {
      list.unshift(record);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Erro ao salvar mensagem no localStorage:", e);
  }
}

/**
 * Remove registro do localStorage
 */
export function removeLocalSentMessage(identifier: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    let list: SentMessageRecord[] = JSON.parse(raw);
    const cleanId = identifier.replace(/\D/g, "");
    list = list.filter(
      (item) =>
        item.companyId !== identifier &&
        item.id !== identifier &&
        (cleanId ? item.cnpj.replace(/\D/g, "") !== cleanId : true)
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Erro ao remover registro do localStorage:", e);
  }
}

/**
 * Busca a lista persistida no servidor (/api/recent-companies/messages)
 */
export async function fetchRemoteSentMessages(): Promise<SentMessageRecord[]> {
  try {
    const res = await fetch("/api/recent-companies/messages", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      // Atualiza também o localStorage com os dados do servidor
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.data));
      }
      return data.data;
    }
    return [];
  } catch (err) {
    console.warn("Erro ao sincronizar mensagens do servidor:", err);
    return [];
  }
}

/**
 * Cria ou atualiza mensagem no backend e no localStorage
 */
export async function recordSentMessage(
  company: RecentCompanyLead,
  messageText: string,
  status: MessageStatus = "enviada",
  observacoes: string = ""
): Promise<SentMessageRecord> {
  const nowIso = new Date().toISOString();
  const cleanPhone = company.contato.telefoneWhatsapp.replace(/[^0-9]/g, "");

  const tempRecord: SentMessageRecord = {
    id: `sent_${company.id}_${Date.now()}`,
    companyId: company.id,
    cnpj: company.cnpj,
    razaoSocial: company.razaoSocial,
    nomeFantasia: company.nomeFantasia,
    bairroRegiao: company.bairroRegiao,
    enderecoCompleto: company.enderecoCompleto,
    telefoneFormatado: company.contato.telefoneFormatado,
    telefoneWhatsapp: cleanPhone,
    socioNome: company.socioPrincipal.nome,
    setorRotulo: company.setorRotulo,
    diasCriacao: company.diasCriacao,
    mensagem: messageText,
    enviadoEm: nowIso,
    status,
    observacoes,
  };

  // Salva no localStorage imediatamente
  saveLocalSentMessage(tempRecord);

  // Sincroniza com o servidor
  try {
    const res = await fetch("/api/recent-companies/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tempRecord),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        saveLocalSentMessage(data.data);
        return data.data;
      }
    }
  } catch (err) {
    console.error("Erro ao enviar mensagem para a API:", err);
  }

  return tempRecord;
}

/**
 * Atualiza status e observação no servidor e localStorage
 */
export async function updateSentMessageStatus(
  companyId: string,
  status: MessageStatus,
  observacoes?: string
): Promise<boolean> {
  try {
    // Atualiza local primeiro
    const localMap = getLocalSentMessages();
    const existing = localMap[companyId];
    if (existing) {
      existing.status = status;
      if (observacoes !== undefined) existing.observacoes = observacoes;
      saveLocalSentMessage(existing);
    }

    const res = await fetch("/api/recent-companies/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, status, observacoes }),
    });
    return res.ok;
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    return false;
  }
}

/**
 * Deleta registro do servidor e localStorage
 */
export async function deleteSentMessage(companyId: string): Promise<boolean> {
  removeLocalSentMessage(companyId);
  try {
    const res = await fetch(`/api/recent-companies/messages?companyId=${encodeURIComponent(companyId)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("Erro ao excluir mensagem:", err);
    return false;
  }
}
