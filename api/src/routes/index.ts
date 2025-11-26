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
import conteste from './conteste.js';
import ateste from './ateste.js';
import satisfacao from './satisfacao.js';
import { poolGate } from '../middleware/poolGate.js';

const router = Router();

router.use(health);

const qTh = Number(process.env.DB_QUEUE_THRESHOLD ?? 15);
router.use('/api/produtos', poolGate({ queueThreshold: qTh }));
router.use('/api/pedidos', poolGate({ queueThreshold: qTh }));
router.use('/api/pedido', poolGate({ queueThreshold: qTh }));
router.use('/api/financeiro', poolGate({ queueThreshold: qTh }));
router.use('/api/conteste', poolGate({ queueThreshold: qTh }));

router.use(auth);
router.use(produtos);
router.use(pedido);
router.use(pedidos);
router.use(carrinho);
router.use(usuarios);
router.use(setores);
router.use(financeiro);
router.use(conteste);
router.use(ateste);
router.use(satisfacao);

router.use(dev);

export default router;