import './styles.css';
import './prototype/prototype.css';
import { createPrototypeApp } from './prototype/app';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('App root not found');
}

root.innerHTML = '';
root.appendChild(createPrototypeApp());
