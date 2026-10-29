
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Categoria {
  idcategoria: number;
  categoria: string;
}

export interface Produto {
  iditem: number;
  codigoPreco: number;
  precoVenda: number;
  unidade: string | null;
  iditemNavigation?: {
    item1: string | null;
    descricaoItem: string | null;
    preco: number;
    tipoItem: string | null;
    ativoProdutoServico: string;
    idcategoria: number;
  };
}

export interface Pessoa {
  idPessoa?: number;
  nome: string;
  cpf: number;
  dataNascimento: string;
  sexo: string;
  email: string;
  telefone: number;
  ativoPessoa: string;
}

// Dados enviados para registrar um pedido
export interface AtendimentoItemPost {
  idItem: number;
  idFuncionario: number;
  quantidade: number;
  valorUnitario: number;
}

// Pedido completo
export interface AtendimentoPost {
  idPessoa: number;
  dataAtendimento: string;
  statusAtendimento: string;
  itens: AtendimentoItemPost[];
}

@Injectable({
  providedIn: 'root'
})
export class ProdutoApi {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'https://localhost:7196/api/ProdutoItem';

  private readonly categoriaUrl =
    'https://localhost:7196/api/Categorium';

  private readonly pessoaUrl =
    'https://localhost:7196/api/Pessoa';

  private readonly atendimentoUrl =
    'https://localhost:7196/api/Atendimento';

  // Listar produtos
  listar(): Observable<Produto[]> {
    return this.http.get<Produto[]>(this.apiUrl);
  }

  // Buscar produto pelo ID
  buscarPorId(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${this.apiUrl}/${id}`);
  }

  // Listar categorias
  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.categoriaUrl);
  }

  // Listar pessoas cadastradas
  listarPessoas(): Observable<Pessoa[]> {
    return this.http.get<Pessoa[]>(this.pessoaUrl);
  }

  // Cadastrar uma pessoa
  cadastrarPessoa(pessoa: Pessoa): Observable<unknown> {
    return this.http.post(this.pessoaUrl, pessoa);
  }

  // Buscar uma pessoa pelo ID
  buscarPessoaPorId(id: number): Observable<Pessoa> {
    return this.http.get<Pessoa>(`${this.pessoaUrl}/${id}`);
  }

  // Atualizar uma pessoa
  atualizarPessoa(
    id: number,
    pessoa: Pessoa
  ): Observable<unknown> {
    return this.http.put(`${this.pessoaUrl}/${id}`, pessoa);
  }

  // Excluir uma pessoa
  excluirPessoa(id: number): Observable<unknown> {
    return this.http.delete(`${this.pessoaUrl}/${id}`);
  }

  // Finalizar pedido
  finalizarPedido(pedido: AtendimentoPost): Observable<unknown> {
    return this.http.post(this.atendimentoUrl, pedido);
  }
}
