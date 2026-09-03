import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrls: ['./about.css']
})
export class About {
  stats = [
    { val: '4',   key: 'industry protocols supported' },
    { val: '1 BE', key: 'NestJS authorization server' },
    { val: 'RLS',  key: 'row-level security enforced' },
    { val: '3 FE', key: 'web, admin & mobile clients' },
  ];

  tags = ['NestJS', 'Supabase + RLS', 'Angular', 'React Native', 'TypeScript', 'PostgreSQL'];
}
