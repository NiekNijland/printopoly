import { pagesPlugin } from './pages.js';
import { inSource, tester } from './rule-tester.js';

const filename = inSource('pages/home.tsx');
const destructure = [{ messageId: 'destructure' }];

tester.run('pages/destructure-props', pagesPlugin.rules['destructure-props'], {
    valid: [
        'const Home = ({ title }: Props) => <h1>{title}</h1>;',
        'const Home = (props: Props) => <Layout {...props} />;',
        'const Home = (props: Props) => <Layout page={props} />;',
        'const Home = () => <h1 />;',
        'const helper = (props: Props) => props.title;',
        'export default function Home({ title }: Props) { return <h1>{title}</h1>; }',
    ].map((code) => ({ code, filename })),
    invalid: [
        'const Home = (props: Props) => <h1>{props.title}</h1>;',
        'const Home = (props: Props) => { const { title } = props; return <h1>{title}</h1>; };',
        'function Home(props: Props) { return <h1>{props.title}</h1>; }',
        'export default function Home(props: Props) { return <h1>{props.title}</h1>; }',
        'export function Home(props: Props) { return <h1>{props.title}</h1>; }',
    ].map((code) => ({ code, filename, errors: destructure })),
});
