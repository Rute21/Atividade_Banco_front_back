
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ProdutoApi,
  Produto,
  Categoria,
  Pessoa,
  AtendimentoPost
} from './services/produto-api';
import { timeout } from 'rxjs';

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly produtoApi = inject(ProdutoApi);
  private readonly detector = inject(ChangeDetectorRef);

  produtos: Produto[] = [];
  categorias: Categoria[] = [];
  carrinho: ItemCarrinho[] = [];

  carregando = true;
  erro = '';

  pesquisa = '';
  categoriaSelecionada = '';
  tipoSelecionado = '';

  novaPessoa: Pessoa = this.pessoaVazia();

  enviandoPessoa = false;
  sucessoPessoa = '';
  erroPessoa = '';

  idPessoaCadastrada: number | null = null;

  finalizandoPedido = false;
  sucessoPedido = '';
  erroPedido = '';

  private readonly idFuncionario = 76;

  pessoaVazia(): Pessoa {
    return {
      nome: '',
      cpf: 0,
      dataNascimento: '',
      sexo: '',
      email: '',
      telefone: 0,
      ativoPessoa: 'S'
    };
  }

  ngOnInit(): void {
    this.produtoApi.listar().subscribe({
      next: (dados) => {
        this.produtos = dados;
        this.carregando = false;
        this.detector.detectChanges();
      },
      error: (erro) => {
        console.error('Erro ao carregar produtos:', erro);
        this.erro = 'Não foi possível carregar os produtos.';
        this.carregando = false;
        this.detector.detectChanges();
      }
    });

    this.produtoApi.listarCategorias().subscribe({
      next: (dados) => {
        this.categorias = dados;
        this.detector.detectChanges();
      },
      error: (erro) => {
        console.error('Erro ao carregar categorias:', erro);
      }
    });
  }

  get produtosFiltrados(): Produto[] {
    return this.produtos.filter((produto) => {
      const nome = produto.iditemNavigation?.item1 || '';
      const categoria = produto.iditemNavigation?.idcategoria;
      const tipo = produto.iditemNavigation?.tipoItem || '';

      const correspondeNome = nome
        .toLowerCase()
        .includes(this.pesquisa.toLowerCase());

      const correspondeCategoria =
        this.categoriaSelecionada === '' ||
        String(categoria) === this.categoriaSelecionada;

      const correspondeTipo =
        this.tipoSelecionado === '' ||
        tipo.toLowerCase() === this.tipoSelecionado.toLowerCase();

      return correspondeNome && correspondeCategoria && correspondeTipo;
    });
  }

  get tipos(): string[] {
    return [...new Set(
      this.produtos
        .map((produto) => produto.iditemNavigation?.tipoItem)
        .filter((tipo): tipo is string => !!tipo)
    )];
  }

  nomeCategoria(idcategoria: number | undefined): string {
    if (idcategoria === undefined) {
      return 'Categoria não informada';
    }

    const categoria = this.categorias.find(
      (item) => Number(item.idcategoria) === Number(idcategoria)
    );

    return categoria
      ? categoria.categoria
      : `Categoria ${idcategoria}`;
  }

  cadastrarPessoa(): void {
    this.sucessoPessoa = '';
    this.erroPessoa = '';

    if (
      !this.novaPessoa.nome.trim() ||
      !this.novaPessoa.cpf ||
      !this.novaPessoa.dataNascimento ||
      !this.novaPessoa.sexo ||
      !this.novaPessoa.email.trim() ||
      !this.novaPessoa.telefone
    ) {
      this.erroPessoa = 'Preencha todos os campos do cadastro.';
      return;
    }

    this.enviandoPessoa = true;

    const pessoa: Pessoa = {
      nome: this.novaPessoa.nome.trim(),
      cpf: Number(this.novaPessoa.cpf),
      dataNascimento: this.novaPessoa.dataNascimento,
      sexo: this.novaPessoa.sexo,
      email: this.novaPessoa.email.trim(),
      telefone: Number(this.novaPessoa.telefone),
      ativoPessoa: 'S'
    };

    this.produtoApi.cadastrarPessoa(pessoa)
      .pipe(timeout(15000))
      .subscribe({
        next: (resposta: any) => {
          console.log('Cliente cadastrada:', resposta);

          const idRecebido =
            resposta?.idpessoa ??
            resposta?.idPessoa ??
            resposta?.Idpessoa;

          this.idPessoaCadastrada =
            idRecebido != null ? Number(idRecebido) : null;

          this.sucessoPessoa = this.idPessoaCadastrada !== null
            ? 'Cliente cadastrada com sucesso! Já pode finalizar seu pedido.'
            : 'Cadastro realizado, mas não foi possível identificar o ID da cliente.';

          this.novaPessoa = this.pessoaVazia();
          this.enviandoPessoa = false;
          this.detector.detectChanges();
        },
        error: (erro) => {
          console.error('Erro ao cadastrar cliente:', erro);

          this.erroPessoa = erro.name === 'TimeoutError'
            ? 'A API demorou para responder. Verifique se ela está funcionando.'
            : 'Não foi possível cadastrar a cliente. Confira o erro no console.';

          this.enviandoPessoa = false;
          this.detector.detectChanges();
        }
      });
  }

  adicionarAoCarrinho(produto: Produto): void {
    this.sucessoPedido = '';
    this.erroPedido = '';

    const itemExistente = this.carrinho.find(
      (item) => item.produto.iditem === produto.iditem
    );

    if (itemExistente) {
      itemExistente.quantidade++;
    } else {
      this.carrinho.push({ produto, quantidade: 1 });
    }
  }

  aumentarQuantidade(item: ItemCarrinho): void {
    item.quantidade++;
    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  diminuirQuantidade(item: ItemCarrinho): void {
    if (item.quantidade > 1) {
      item.quantidade--;
    } else {
      this.removerDoCarrinho(item);
    }

    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  removerDoCarrinho(item: ItemCarrinho): void {
    this.carrinho = this.carrinho.filter(
      (produto) => produto !== item
    );

    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  finalizarPedido(): void {
    this.sucessoPedido = '';
    this.erroPedido = '';

    if (this.finalizandoPedido) {
      return;
    }

    if (this.carrinho.length === 0) {
      this.erroPedido = 'Adicione produtos ao carrinho antes de finalizar.';
      return;
    }

    if (this.idPessoaCadastrada === null) {
      this.erroPedido = 'Cadastre a cliente antes de finalizar o pedido.';
      return;
    }

    const itensInvalidos = this.carrinho.some((item) =>
      !Number.isInteger(Number(item.produto.iditem)) ||
      Number(item.produto.iditem) <= 0 ||
      !Number.isInteger(item.quantidade) ||
      item.quantidade <= 0 ||
      !Number.isFinite(Number(item.produto.precoVenda)) ||
      Number(item.produto.precoVenda) < 0
    );

    if (itensInvalidos) {
      this.erroPedido = 'Confira os produtos, quantidades e preços do carrinho.';
      return;
    }

    const dataHoje = new Date();
    const dataAtendimento = [
      dataHoje.getFullYear(),
      String(dataHoje.getMonth() + 1).padStart(2, '0'),
      String(dataHoje.getDate()).padStart(2, '0')
    ].join('-');

    const pedido: AtendimentoPost = {
      idPessoa: Number(this.idPessoaCadastrada),
      dataAtendimento,
      statusAtendimento: 'P',
      itens: this.carrinho.map((item) => ({
        idItem: Number(item.produto.iditem),
        idFuncionario: this.idFuncionario,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.produto.precoVenda)
      }))
    };

    console.log('Pedido enviado:', JSON.stringify(pedido, null, 2));

    this.finalizandoPedido = true;

    this.produtoApi.finalizarPedido(pedido)
      .pipe(timeout(15000))
      .subscribe({
        next: (resposta) => {
          console.log('Pedido salvo:', resposta);

          this.sucessoPedido = 'Pedido finalizado e registrado com sucesso!';
          this.carrinho = [];
          this.finalizandoPedido = false;
          this.detector.detectChanges();
        },
        error: (erro) => {
          console.error('Erro ao finalizar pedido:', erro);
          console.error('Detalhes recebidos da API:', erro?.error);

          if (erro.name === 'TimeoutError') {
            this.erroPedido = 'A API demorou para responder. Tente novamente após verificar o servidor.';
          } else if (erro.status === 0) {
            this.erroPedido = 'Não foi possível conectar à API. Verifique se o backend está aberto e se o endereço está correto.';
          } else if (erro.status === 500) {
            this.erroPedido = 'O servidor encontrou um erro ao salvar o pedido. Confira os detalhes no console e no terminal do backend.';
          } else {
            this.erroPedido = `Não foi possível finalizar o pedido. Erro HTTP: ${erro.status}. Confira o console.`;
          }

          this.finalizandoPedido = false;
          this.detector.detectChanges();
        }
      });
  }

  get quantidadeTotal(): number {
    return this.carrinho.reduce(
      (total, item) => total + item.quantidade,
      0
    );
  }

  subtotalItem(item: ItemCarrinho): number {
    return Number(item.produto.precoVenda) * item.quantidade;
  }

  get valorTotal(): number {
    return this.carrinho.reduce(
      (total, item) =>
        total + Number(item.produto.precoVenda) * item.quantidade,
      0
    );
  }
}
