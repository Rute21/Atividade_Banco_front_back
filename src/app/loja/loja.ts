// Importações do Angular
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Importações do serviço da API
import {
  ProdutoApi,
  Produto,
  Servico,
  Categoria,
  Pessoa,
  AtendimentoPost
} from '../services/produto-api';

import { timeout } from 'rxjs';

// Representa um item do carrinho
interface ItemCarrinho {
  idItem: number;
  nome: string;
  preco: number;
  tipoItem: string;
  quantidade: number;
}

// Formato utilizado para exibir produtos e serviços
interface ItemCatalogo {
  iditem: number;
  nome: string;
  descricao: string | null;
  preco: number;
  tipoItem: string;
  idcategoria: number | undefined;
}

@Component({
  selector: 'app-loja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loja.html',
  styleUrl: './loja.css'
})
export class Loja implements OnInit {

  // Serviço responsável pela comunicação com o backend
  private readonly produtoApi = inject(ProdutoApi);

  // Ajuda a atualizar a tela após receber os dados
  private readonly detector = inject(ChangeDetectorRef);

  // Listas de dados
  produtos: Produto[] = [];
  servicos: Servico[] = [];
  categorias: Categoria[] = [];

  // Carrinho de compras
  carrinho: ItemCarrinho[] = [];

  // Controle de carregamento e erros
  carregando = true;
  carregandoServicos = true;
  erro = '';
  erroServicos = '';

  // Filtros do catálogo
  pesquisa = '';
  categoriaSelecionada = '';
  tipoSelecionado = '';

  // Dados do cadastro de clientes
  novaPessoa: Pessoa = this.pessoaVazia();

  enviandoPessoa = false;
  sucessoPessoa = '';
  erroPessoa = '';

  idPessoaCadastrada: number | null = null;

  // Controle da finalização do pedido
  finalizandoPedido = false;
  sucessoPedido = '';
  erroPedido = '';

  // Funcionário utilizado no pedido
  private readonly idFuncionario = 76;

  // Cria uma pessoa vazia para o formulário
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

  // Carrega os dados quando a loja é aberta
  ngOnInit(): void {

    // Busca os produtos
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

    // Busca os serviços
    this.produtoApi.listarServicos().subscribe({
      next: (dados) => {
        this.servicos = dados.filter(
          (servico) => servico.tipoItem === 'S'
        );

        this.carregandoServicos = false;
        this.detector.detectChanges();
      },
      error: (erro) => {
        console.error('Erro ao carregar serviços:', erro);
        this.erroServicos = 'Não foi possível carregar os serviços.';
        this.carregandoServicos = false;
        this.detector.detectChanges();
      }
    });

    // Busca as categorias
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

  // Junta produtos e serviços em uma lista
  get itensCatalogo(): ItemCatalogo[] {

    const listaProdutos: ItemCatalogo[] = this.produtos.map((produto) => ({
      iditem: produto.iditem,
      nome: produto.iditemNavigation?.item1 || '',
      descricao: produto.iditemNavigation?.descricaoItem || '',
      preco: Number(produto.precoVenda),
      tipoItem: 'P',
      idcategoria: produto.iditemNavigation?.idcategoria
    }));

    const listaServicos: ItemCatalogo[] = this.servicos.map((servico) => ({
      iditem: servico.iditem,
      nome: servico.item1 || '',
      descricao: servico.descricaoItem || '',
      preco: Number(servico.preco),
      tipoItem: 'S',
      idcategoria: servico.idcategoria
    }));

    // Aplica os filtros selecionados
    return [...listaProdutos, ...listaServicos].filter((item) => {

      const correspondeNome = item.nome
        .toLowerCase()
        .includes(this.pesquisa.toLowerCase());

      const correspondeCategoria =
        this.categoriaSelecionada === '' ||
        String(item.idcategoria) === this.categoriaSelecionada;

      const correspondeTipo =
        this.tipoSelecionado === '' ||
        item.tipoItem === this.tipoSelecionado;

      return correspondeNome &&
        correspondeCategoria &&
        correspondeTipo;
    });
  }

  // Procura o nome da categoria
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

  // Cadastra uma cliente
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

  // Adiciona um produto ou serviço ao carrinho
  adicionarAoCarrinho(item: ItemCatalogo): void {

    this.sucessoPedido = '';
    this.erroPedido = '';

    const itemExistente = this.carrinho.find(
      (produto) => produto.idItem === item.iditem
    );

    if (itemExistente) {
      itemExistente.quantidade++;
    } else {
      this.carrinho.push({
        idItem: item.iditem,
        nome: item.nome,
        preco: item.preco,
        tipoItem: item.tipoItem,
        quantidade: 1
      });
    }
  }

  // Aumenta a quantidade
  aumentarQuantidade(item: ItemCarrinho): void {
    item.quantidade++;
    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  // Diminui a quantidade
  diminuirQuantidade(item: ItemCarrinho): void {

    if (item.quantidade > 1) {
      item.quantidade--;
    } else {
      this.removerDoCarrinho(item);
    }

    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  // Remove um item do carrinho
  removerDoCarrinho(item: ItemCarrinho): void {

    this.carrinho = this.carrinho.filter(
      (produto) => produto !== item
    );

    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  // Finaliza o pedido
  finalizarPedido(): void {

    this.sucessoPedido = '';
    this.erroPedido = '';

    if (this.finalizandoPedido) {
      return;
    }

    if (this.carrinho.length === 0) {
      this.erroPedido = 'Adicione produtos ou serviços ao carrinho antes de finalizar.';
      return;
    }

    if (this.idPessoaCadastrada === null) {
      this.erroPedido = 'Cadastre a cliente antes de finalizar o pedido.';
      return;
    }

    const itensInvalidos = this.carrinho.some((item) =>
      !Number.isInteger(Number(item.idItem)) ||
      Number(item.idItem) <= 0 ||
      !Number.isInteger(item.quantidade) ||
      item.quantidade <= 0 ||
      !Number.isFinite(Number(item.preco)) ||
      Number(item.preco) < 0
    );

    if (itensInvalidos) {
      this.erroPedido = 'Confira os produtos, serviços, quantidades e preços do carrinho.';
      return;
    }

    // Obtém a data atual
    const dataHoje = new Date();

    const dataAtendimento = [
      dataHoje.getFullYear(),
      String(dataHoje.getMonth() + 1).padStart(2, '0'),
      String(dataHoje.getDate()).padStart(2, '0')
    ].join('-');

    // Monta os dados do pedido
    const pedido: AtendimentoPost = {
      idPessoa: Number(this.idPessoaCadastrada),
      dataAtendimento,
      statusAtendimento: 'P',
      itens: this.carrinho.map((item) => ({
        idItem: Number(item.idItem),
        idFuncionario: this.idFuncionario,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.preco)
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

  // Calcula a quantidade total
  get quantidadeTotal(): number {
    return this.carrinho.reduce(
      (total, item) => total + item.quantidade,
      0
    );
  }

  // Calcula o subtotal de um item
  subtotalItem(item: ItemCarrinho): number {
    return item.preco * item.quantidade;
  }

  // Calcula o valor total
  get valorTotal(): number {
    return this.carrinho.reduce(
      (total, item) => total + item.preco * item.quantidade,
      0
    );
  }
}