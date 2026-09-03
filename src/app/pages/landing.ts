import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from './landing/components/navbar/navbar';
import { Hero } from './landing/components/hero/hero';
import { Services } from './landing/components/services/services';
import { About } from './landing/components/about/about';
import { Footer } from './landing/components/footer/footer';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, Navbar, Hero, Services, About, Footer],
  styleUrl: './landing.css',
  templateUrl: './landing.html',
})
export class Landing {}
