
// Importa os recursos necessários do Angular
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';

// Permite utilizar recursos como *ngIf, *ngFor e pipes
import { CommonModule } from '@angular/common';

// Permite utilizar formulários e o [(ngModel)]
import { FormsModule } from '@angular/forms';

// Importa os tipos e o serviço que fazem a comunicação com o backend
import {
  ProdutoApi,
  Produto,
  Servico,
  Categoria,
  Pessoa,
  AtendimentoPost
} from './services/produto-api';

// Importa o timeout para limitar o tempo de espera das requisições
import { timeout } from 'rxjs';

// Define como será cada item dentro do carrinho
interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}

// Define um formato único para mostrar produtos e serviços juntos
interface ItemCatalogo {
  nome: string;
  descricao: string | null;
  preco: number;
  tipoItem: string;
  idcategoria: number | undefined;
  produto?: Produto;
}

// Configura o componente principal da aplicação
@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

// Classe principal da página
export class App implements OnInit {

  // Cria acesso ao serviço que conversa com a API
  private readonly produtoApi = inject(ProdutoApi);

  // Permite atualizar a tela depois de receber os dados
  private readonly detector = inject(ChangeDetectorRef);

  // Listas que armazenam os dados recebidos do backend
  produtos: Produto[] = [];
  servicos: Servico[] = [];
  categorias: Categoria[] = [];

  // Lista de produtos escolhidos pelo cliente
  carrinho: ItemCarrinho[] = [];

  // Controlam o carregamento e as mensagens de erro
  carregando = true;
  carregandoServicos = true;
  erro = '';
  erroServicos = '';

  // Guardam o que o cliente digita e seleciona nos filtros
  pesquisa = '';
  categoriaSelecionada = '';
  tipoSelecionado = '';

  // Guarda os dados da pessoa que será cadastrada
  novaPessoa: Pessoa = this.pessoaVazia();

  // Controlam o cadastro de clientes
  enviandoPessoa = false;
  sucessoPessoa = '';
  erroPessoa = '';

  // Guarda o ID da cliente cadastrada
  idPessoaCadastrada: number | null = null;

  // Controlam a finalização do pedido
  finalizandoPedido = false;
  sucessoPedido = '';
  erroPedido = '';

  // ID do funcionário utilizado no registro do atendimento
  private readonly idFuncionario = 76;

  // Cria um formulário vazio para uma nova pessoa
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

  // Executa automaticamente quando a página é iniciada
  ngOnInit(): void {

    // Busca os produtos cadastrados no backend
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

    // Busca os serviços cadastrados no backend
    this.produtoApi.listarServicos().subscribe({
      next: (dados) => {

        // Mantém somente os registros identificados como serviço (S)
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

    // Busca as categorias cadastradas no backend
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

  // Junta os produtos e serviços em uma única lista
  get itensCatalogo(): ItemCatalogo[] {

    // Transforma os produtos no formato utilizado pelo catálogo
    const listaProdutos: ItemCatalogo[] = this.produtos.map((produto) => ({
      nome: produto.iditemNavigation?.item1 || '',
      descricao: produto.iditemNavigation?.descricaoItem || '',
      preco: Number(produto.precoVenda),
      tipoItem: 'P',
      idcategoria: produto.iditemNavigation?.idcategoria,
      produto: produto
    }));

    // Transforma os serviços no mesmo formato dos produtos
    const listaServicos: ItemCatalogo[] = this.servicos.map((servico) => ({
      nome: servico.item1 || '',
      descricao: servico.descricaoItem || '',
      preco: Number(servico.preco),
      tipoItem: 'S',
      idcategoria: servico.idcategoria
    }));

    // Junta as duas listas e aplica os filtros escolhidos pelo cliente
    return [...listaProdutos, ...listaServicos].filter((item) => {

      // Verifica se o nome corresponde ao texto pesquisado
      const correspondeNome = item.nome
        .toLowerCase()
        .includes(this.pesquisa.toLowerCase());

      // Verifica se o item pertence à categoria selecionada
      const correspondeCategoria =
        this.categoriaSelecionada === '' ||
        String(item.idcategoria) === this.categoriaSelecionada;

      // Verifica se deve mostrar todos, somente produtos ou serviços
      const correspondeTipo =
        this.tipoSelecionado === '' ||
        item.tipoItem === this.tipoSelecionado;

      // O item só aparece quando atende aos filtros
      return correspondeNome && correspondeCategoria && correspondeTipo;
    });
  }

  // Procura o nome da categoria pelo seu código
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

  // Cadastra uma nova cliente no sistema
  cadastrarPessoa(): void {
    this.sucessoPessoa = '';
    this.erroPessoa = '';

    // Verifica se os campos obrigatórios foram preenchidos
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

    // Organiza os dados antes de enviar para a API
    const pessoa: Pessoa = {
      nome: this.novaPessoa.nome.trim(),
      cpf: Number(this.novaPessoa.cpf),
      dataNascimento: this.novaPessoa.dataNascimento,
      sexo: this.novaPessoa.sexo,
      email: this.novaPessoa.email.trim(),
      telefone: Number(this.novaPessoa.telefone),
      ativoPessoa: 'S'
    };

    // Envia os dados para cadastrar a cliente
    this.produtoApi.cadastrarPessoa(pessoa)
      .pipe(timeout(15000))
      .subscribe({
        next: (resposta: any) => {
          console.log('Cliente cadastrada:', resposta);

          // Tenta identificar o código da cliente retornado pela API
          const idRecebido =
            resposta?.idpessoa ??
            resposta?.idPessoa ??
            resposta?.Idpessoa;

          this.idPessoaCadastrada =
            idRecebido != null ? Number(idRecebido) : null;

          this.sucessoPessoa = this.idPessoaCadastrada !== null
            ? 'Cliente cadastrada com sucesso! Já pode finalizar seu pedido.'
            : 'Cadastro realizado, mas não foi possível identificar o ID da cliente.';

          // Limpa o formulário depois do cadastro
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

  // Adiciona um produto ao carrinho
  adicionarAoCarrinho(produto: Produto): void {
    this.sucessoPedido = '';
    this.erroPedido = '';

    // Verifica se o produto já está no carrinho
    const itemExistente = this.carrinho.find(
      (item) => item.produto.iditem === produto.iditem
    );

    // Se já existe, aumenta a quantidade
    if (itemExistente) {
      itemExistente.quantidade++;
    } else {
      // Se não existe, adiciona um novo item
      this.carrinho.push({ produto, quantidade: 1 });
    }
  }

  // Aumenta a quantidade de um produto no carrinho
  aumentarQuantidade(item: ItemCarrinho): void {
    item.quantidade++;
    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  // Diminui a quantidade de um produto no carrinho
  diminuirQuantidade(item: ItemCarrinho): void {
    if (item.quantidade > 1) {
      item.quantidade--;
    } else {
      this.removerDoCarrinho(item);
    }

    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  // Remove um produto do carrinho
  removerDoCarrinho(item: ItemCarrinho): void {
    this.carrinho = this.carrinho.filter(
      (produto) => produto !== item
    );

    this.sucessoPedido = '';
    this.erroPedido = '';
  }

  // Finaliza o pedido e envia os dados para o backend
  finalizarPedido(): void {
    this.sucessoPedido = '';
    this.erroPedido = '';

    // Impede que o pedido seja enviado mais de uma vez
    if (this.finalizandoPedido) {
      return;
    }

    // Verifica se existe algum produto no carrinho
    if (this.carrinho.length === 0) {
      this.erroPedido = 'Adicione produtos ao carrinho antes de finalizar.';
      return;
    }

    // Exige que uma cliente esteja cadastrada
    if (this.idPessoaCadastrada === null) {
      this.erroPedido = 'Cadastre a cliente antes de finalizar o pedido.';
      return;
    }

    // Verifica se os códigos, quantidades e preços são válidos
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

    // Obtém a data atual no formato ano-mês-dia
    const dataHoje = new Date();
    const dataAtendimento = [
      dataHoje.getFullYear(),
      String(dataHoje.getMonth() + 1).padStart(2, '0'),
      String(dataHoje.getDate()).padStart(2, '0')
    ].join('-');

    // Monta os dados que serão enviados para a API
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

    // Envia o pedido para o backend
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

          // Mostra uma mensagem conforme o tipo de erro
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

  // Calcula a quantidade total de produtos no carrinho
  get quantidadeTotal(): number {
    return this.carrinho.reduce(
      (total, item) => total + item.quantidade,
      0
    );
  }

  // Calcula o subtotal de um produto
  subtotalItem(item: ItemCarrinho): number {
    return Number(item.produto.precoVenda) * item.quantidade;
  }

  // Calcula o valor total do carrinho
  get valorTotal(): number {
    return this.carrinho.reduce(
      (total, item) =>
        total + Number(item.produto.precoVenda) * item.quantidade,
      0
    );
  }
}
