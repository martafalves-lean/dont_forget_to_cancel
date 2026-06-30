-- Esquema da base de dados "Lembre-se de Cancelar"
-- Clinica dentaria multi-local: clinicas, gabinetes, medicos, pacientes e consultas.

create table if not exists clinicas (
  id     text primary key,
  nome   text not null,
  cidade text not null,
  morada text not null
);

create table if not exists gabinetes (
  id         text primary key,
  clinica_id text not null references clinicas (id) on delete cascade,
  nome       text not null
);

create table if not exists medicos (
  id            text primary key,
  clinica_id    text not null references clinicas (id) on delete cascade,
  nome          text not null,
  especialidade text not null
);

create table if not exists pacientes (
  id                          text primary key,
  nome                        text not null,
  idade                       integer not null,
  distancia_km                numeric(5, 1) not null,
  consultas_totais            integer not null default 0,
  faltas                      integer not null default 0,
  cancelamentos_tardios       integer not null default 0,
  meses_desde_ultima_visita   integer,
  telefone                    text not null
);

create table if not exists consultas (
  id                 text primary key,
  clinica_id         text not null references clinicas (id) on delete cascade,
  gabinete_id        text not null references gabinetes (id) on delete cascade,
  medico_id          text not null references medicos (id) on delete cascade,
  paciente_id        text not null references pacientes (id) on delete cascade,
  data               date not null,
  hora               time not null,
  duracao_min        integer not null,
  tipo               text not null,
  estado             text not null,
  data_marcacao      date not null,
  confirmada         boolean not null default false,
  canal_confirmacao  text
);

create index if not exists idx_consultas_clinica_data on consultas (clinica_id, data);
create index if not exists idx_consultas_gabinete on consultas (gabinete_id);

-- RLS: leitura publica (anon) para a demonstracao. Ajuste conforme a politica
-- de seguranca pretendida antes de usar em producao.
alter table clinicas  enable row level security;
alter table gabinetes enable row level security;
alter table medicos   enable row level security;
alter table pacientes enable row level security;
alter table consultas enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'clinicas' and policyname = 'leitura_publica') then
    create policy leitura_publica on clinicas  for select using (true);
    create policy leitura_publica on gabinetes for select using (true);
    create policy leitura_publica on medicos   for select using (true);
    create policy leitura_publica on pacientes for select using (true);
    create policy leitura_publica on consultas for select using (true);
  end if;
end $$;
