import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {

  // Nome do painel
  nomeLoja = 'Plena Beauty';

  // Opções do menu administrativo
  opcoes = [
    {
      titulo: 'Serviços',
      descricao: 'Cadastrar e gerenciar serviços.',
      icone: '✂️',
      rota: 'servicos'
    },
    {
      titulo: 'Produtos',
      descricao: 'Cadastrar e gerenciar produtos.',
      icone: '🧴',
      rota: 'produtos'
    },
    {
      titulo: 'Entrada de produtos',
      descricao: 'Registrar compras e entradas.',
      icone: '📦',
      rota: 'entradas'
    },
    {
      titulo: 'Estoque',
      descricao: 'Consultar quantidades disponíveis.',
      icone: '📊',
      rota: 'estoque'
    },
    {
      titulo: 'Pedidos',
      descricao: 'Consultar e atualizar pedidos.',
      icone: '📋',
      rota: 'pedidos'
    }
  ];

}