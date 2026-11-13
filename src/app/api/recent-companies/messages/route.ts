import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SentMessageRecord, MessageStatus } from "@/types/recentCompanies";

const DATA_DIR = path.join(process.cwd(), "data");
const MESSAGES_FILE = path.join(DATA_DIR, "sent_messages.json");

function ensureFileExists(): SentMessageRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MESSAGES_FILE)) {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const raw = fs.readFileSync(MESSAGES_FILE, "utf-8");
    return JSON.parse(raw) as SentMessageRecord[];
  } catch (err) {
    console.error("Erro ao ler sent_messages.json:", err);
    return [];
  }
}

function saveRecords(records: SentMessageRecord[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export async function GET(request: NextRequest) {
  try {
    const records = ensureFileExists();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as MessageStatus | null;
    const search = searchParams.get("search")?.toLowerCase().trim();

    let filtered = records;

    if (status && status !== ("todos" as any)) {
      filtered = filtered.filter((r) => r.status === status);
    }

    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.nomeFantasia.toLowerCase().includes(search) ||
          r.razaoSocial.toLowerCase().includes(search) ||
          r.cnpj.includes(search) ||
          r.socioNome.toLowerCase().includes(search) ||
          r.bairroRegiao.toLowerCase().includes(search) ||
          (r.observacoes && r.observacoes.toLowerCase().includes(search))
      );
    }

    // Ordenar mais recentes primeiro
    filtered.sort((a, b) => new Date(b.enviadoEm).getTime() - new Date(a.enviadoEm).getTime());

    return NextResponse.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao buscar mensagens enviadas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const records = ensureFileExists();

    const companyId = body.companyId;
    const cnpj = body.cnpj || "";
    const cleanCnpj = cnpj.replace(/\D/g, "");

    if (!companyId && !cleanCnpj) {
      return NextResponse.json(
        { success: false, error: "Identificador da empresa (companyId ou cnpj) é obrigatório." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const existingIndex = records.findIndex(
      (r) =>
        (companyId && r.companyId === companyId) ||
        (cleanCnpj && r.cnpj.replace(/\D/g, "") === cleanCnpj)
    );

    let updatedRecord: SentMessageRecord;

    if (existingIndex >= 0) {
      const existing = records[existingIndex];
      const history = existing.historicoEnvios || [];
      if (existing.mensagem) {
        history.push({
          enviadoEm: existing.enviadoEm,
          mensagem: existing.mensagem,
        });
      }

      updatedRecord = {
        ...existing,
        mensagem: body.mensagem || existing.mensagem,
        enviadoEm: nowIso,
        status: (body.status as MessageStatus) || existing.status || "enviada",
        observacoes: body.observacoes !== undefined ? body.observacoes : existing.observacoes,
        historicoEnvios: history,
      };

      records[existingIndex] = updatedRecord;
    } else {
      updatedRecord = {
        id: `sent_${companyId || cleanCnpj}_${Date.now()}`,
        companyId: companyId || `lead_${cleanCnpj}`,
        cnpj: body.cnpj || "",
        razaoSocial: body.razaoSocial || body.nomeFantasia || "Empresa",
        nomeFantasia: body.nomeFantasia || body.razaoSocial || "Empresa",
        bairroRegiao: body.bairroRegiao || "DF",
        enderecoCompleto: body.enderecoCompleto || "",
        telefoneFormatado: body.telefoneFormatado || body.telefoneWhatsapp || "",
        telefoneWhatsapp: body.telefoneWhatsapp || body.telefoneFormatado || "",
        socioNome: body.socioNome || "Sócio",
        setorRotulo: body.setorRotulo,
        diasCriacao: body.diasCriacao,
        mensagem: body.mensagem || "",
        enviadoEm: nowIso,
        status: (body.status as MessageStatus) || "enviada",
        observacoes: body.observacoes || "",
        historicoEnvios: [],
      };

      records.unshift(updatedRecord);
    }

    saveRecords(records);

    return NextResponse.json({
      success: true,
      message: "Registro de mensagem salva com sucesso.",
      data: updatedRecord,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao salvar mensagem" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const records = ensureFileExists();

    const { id, companyId, status, observacoes } = body;

    const index = records.findIndex(
      (r) => (id && r.id === id) || (companyId && r.companyId === companyId)
    );

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Registro não encontrado para atualização." },
        { status: 404 }
      );
    }

    if (status) {
      records[index].status = status as MessageStatus;
    }
    if (observacoes !== undefined) {
      records[index].observacoes = observacoes;
    }

    saveRecords(records);

    return NextResponse.json({
      success: true,
      message: "Status atualizado com sucesso.",
      data: records[index],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao atualizar registro" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const companyId = searchParams.get("companyId");

    let records = ensureFileExists();
    const initialLen = records.length;

    records = records.filter(
      (r) => (!id || r.id !== id) && (!companyId || r.companyId !== companyId)
    );

    if (records.length === initialLen) {
      return NextResponse.json(
        { success: false, error: "Registro não encontrado para remoção." },
        { status: 404 }
      );
    }

    saveRecords(records);

    return NextResponse.json({
      success: true,
      message: "Registro removido com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao excluir registro" },
      { status: 500 }
    );
  }
}
