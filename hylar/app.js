// По балльной системе Германия получила 12 баллов, США, Швейцария - 4, Англия, Китай, Швеция - 3, Франция, Япония - 2 балла

let  Hylar = require('hylar');
let h = new Hylar();
let getBase = require('./getBase');
let { prefixedToFullUri } = require('./prefixes');
let view = require('./view');

let q = `
SELECT *
WHERE { ?s ?p ?o }
`

let terms = [
    // 'По',
    // 'балльной',
    // 'системе',
    // 'Германия',
    // 'получила',
    // '12',
    // 'баллов',
    // ',',
    // 'США',
    // ',',
    // 'Швейцария',
    // '-',
    // '4',
    // ',',
    // 'Англия',
    // ',',
    // 'Китай',
    // ',',
    // 'Швеция',
    // '-',
    // '3',
    // ',',
    // 'Франция',
    // ',',
    // 'Япония',
    // '-',
    // '2',
    // 'балла',
    'петя',
    'составляет',
    'карту'
]

let fakeRules = [
    {
        // id: 1,
        rule: '(?s ?p ?o) ^ (?s ?p ?o) -> (_:UNIQUE owl:Source ?o) ^ (_:UNIQUE owl:pred ?p) ^ (_:UNIQUE owl:Target ?s)'
    },
    // {
    //     id: 2,
    //     rule: '(?s ?p ?o) -> (_:UNIQUE2 owl:Source ?o) ^ (_:UNIQUE2 owl:pred ?p) ^ (_:UNIQUE2 owl:Target ?s)'
    // }
]
let fakeTurtles = `
    @prefix : <http://ex.com#> .

    :a :p1 :b .
    :b :p2 :c .
`
// parseAndAddRules(fakeRules)
parseAndAddRules(require('../rules/_all.json'))
// parseAndAddRules(require('../handMadeRules.json'))
// parseAndAddRules(false)
    .then((msg) => {
        console.log(msg);
        return getBase(terms)
    })
    .then((turtles) => {
        return h.load(turtles, 'text/turtle', false);
        // return h.load(fakeTurtles, 'text/turtle', false);
    })
    .then((loaded) => console.log('loaded:', loaded))
    .then(() => {
        return h.query(q);
    })
    .then((res) => {
        view(res);
    })
    .then(() => {
        // oracle('петя составляет карту');
        oracle('петя составляет');
    })

function parseAndAddRules(rules) {
    return new Promise((resolve, reject) => {
        if (rules) {
            let l = rules.length;
            for(i = 0; i < l; i++) {
                let r = rules[i];
                r.rule = prefixedToFullUri(r.rule);
                h.parseAndAddRule(r.rule, r.id);
            }
            resolve(`parsed ${l} rules`);
        }
        else resolve('no rules')
    })
}

function searchArc(head, dep, cb) {
    head = head.toLowerCase();
    dep = dep.toLowerCase();
    let q = `
    PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    SELECT ?linkType ?linkId
    WHERE { 
        ?headId ontolex:writtenRep "${head}"@ru .
        ?depId ontolex:writtenRep "${dep}"@ru .
        ?linkId rdf:type ?linkType ;
                owl:annotatedSource ?headId ;
                owl:annotatedTarget ?depId .
    }
    `
    h.query(q)
        .then(res => {
            res.forEach(r => {
                let str = `${r.linkType.value} (${r.linkId.value})`
                cb(str);
            })
            // console.log(res);
            
        })
}

function oracle(sentence) {
    console.log(sentence);
    sentence = sentence.split(' ');
    
    for (let i = 0; i < sentence.length; i++) {
        let found = false;
        let leftIndex = i - 1;
        let rightIndex = i + 1;
        let w1 = sentence[i];
        
        while (!found) {
            console.log(i, rightIndex, leftIndex);
            
            if (rightIndex <= sentence.length - 1) {
                let w2 = sentence[rightIndex];
                searchArc(w1, w2, (arc) => {
                    found = arc;
                    console.log("Right ", w1, " и ", w2, i, rightIndex," связь : ", found);
                });
                rightIndex++;
            }
            if (leftIndex >= 0 && !found) {
                let w2 = sentence[leftIndex];
                searchArc(w1, w2, (arc) => {
                    found = arc;
                    console.log("Left ", w1, " и ", w2, i, leftIndex," связь : ", found);
                });
                leftIndex--;
            }
            if (leftIndex < 0 && rightIndex > sentence.length - 1) break
        }
    }
}