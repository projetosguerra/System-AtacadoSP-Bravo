import { Router } from 'express';
import auth from './auth.js';
import produtos from './produtos.js';
import pedido from './pedido.js';
import pedidos from './pedidos.js';
import carrinho from './carrinho.js';
import usuarios from './usuarios.js';
import setores from './setores.js';
import financeiro from './financeiro.js';
import dev from './dev.js';
import health from './health.js';

const router = Router();

router.use(health);

router.use(auth);
router.use(produtos);
router.use(pedido);
router.use(pedidos);
router.use(carrinho);
router.use(usuarios);
router.use(setores);
router.use(financeiro);
router.use(dev);

export default router;