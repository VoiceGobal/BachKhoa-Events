// Keep the main spin endpoint explicit so it receives a concrete Vercel route.
import { proxyApiRequest } from '../../src/apiProxy';

export default proxyApiRequest;
