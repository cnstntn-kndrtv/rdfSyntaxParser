let conllu = require('conllu');
let fs = require('fs');
let conllTags2rdf = require('./utils/conllTags2rdf');

let c = new conllu.Conllu()
// c.serial = fs.readFileSync('./syntagrus/ru_syntagrus-ud-train.conllu', 'utf8');
c.serial = fs.readFileSync('./syntagrus/ru_syntagrus-ud-test.conllu', 'utf8');
// c.serial = fs.readFileSync('./syntagrus/test.conllu', 'utf8');

// { type:'amod', rule: '...', frequency: 1, weight: 1, id: type+uniqNumber }
let rules = [];
function parseSentence(sentence) {
    let tokens = sentence.tokens;
    let sentenceText = sentence.comments[1];
    let l = tokens.length;
    for (let i = 0; i < l; i++) {
        w1 = tokens[i];
        let deps = w1.deps.split(':');
        let dep = deps[1];
        let headId = deps[0];
        let w2 = false;
        let rule = false;
        if (dep != 'root') {
            for (let j = 0; j < l; j++) {
                let t = tokens[j];
                if (t.id == headId) {
                    w2 = t;
                    break;
                }
             }
             rule = createWordsRule(w1, w2, dep, sentenceText);
        }
        else {
            rule = createRootRule(w1, dep, sentenceText);
        }
        if (rule) rules.push(rule);
    };
};

function getRdfPos (postag) {
    return rfdPosTag = conllTags2rdf['upostag'][postag];
}

function createRdfFeats(feats) {
    let result = [];
    if(feats) {
        for(key in feats) {
            let rdfFeat = conllTags2rdf['feats'][key][feats[key]];
            if (rdfFeat != undefined) result.push(rdfFeat);
        };
    };
    return result;
}

function getFeats(str) {
    if (str) {
        let featsArray = str.split("|");
        featsArray = featsArray.sort((a, b) => {
            if (a < b)
              return -1;
            if (a > b)
              return 1;
            return 0;
        })
        let feats = {};
        featsArray.forEach((f) => {
            let oneFeat = f.split("=");
            feats[oneFeat[0]] = oneFeat[1];
        })
    return feats;
    }
};

function createPreTriples(rdfPos, rdfFeats) {
    let preTriples = [];
    if (rdfPos) preTriples.push(rdfPos);
    if(rdfFeats.length != 0) {
        rdfFeats.forEach((f) => preTriples.push(f))
    };
    return preTriples;
}

function createWordsRule(w1, w2, dependency, sentenceText) {
    let head = w2;
    let dependant = w1;

    let headRdfPos = getRdfPos(head.upostag);
    let depRdfPos = getRdfPos(dependant.upostag);
    
    let headUdFeats = getFeats(head.feats);
    let headRdfFeats = createRdfFeats(headUdFeats);

    let depUdFeats = getFeats(dependant.feats);
    let depRdfFeats = createRdfFeats(depUdFeats);

    let headPreTriples = createPreTriples(headRdfPos, headRdfFeats);
    let depPreTriples = createPreTriples(depRdfPos, depRdfFeats);

    let headPrereq = headPreTriples.map((p) => `(?H ${p})`).join(' ^ ');
    let depPrereq = depPreTriples.map((p) => `(?D ${p})`).join(' ^ ');

    let prerequisites = '';
    //  = headPrereq + ' ^ ' + depPrereq;
    if (headPrereq != '') prerequisites += headPrereq;
    if (headPrereq != '' && depPrereq != '') prerequisites += ` ^ ${depPrereq}`;
    else prerequisites += depPrereq;
    
    return createRuleObject(dependency, prerequisites, sentenceText, w1, w2);
};

function createRootRule(w1, dep, sentenceText) {
    var pos1 = conllTags2rdf['upostag'][w1.upostag];
    var w1UdFeats = getFeats(w1.feats);
    var w1RdfFeats = createRdfFeats(w1UdFeats);
    var preTriples1 = createPreTriples(pos1, w1RdfFeats);

    var prerequisites = '';
    for(let i = 0; i < preTriples1.length; i++) {
        prerequisites += '(?D ' + preTriples1[i] + ')';
        if (i < preTriples1.length - 1) prerequisites += ' ^ ';
    };
    
    return createRuleObject(w1.deprel, prerequisites, sentenceText, w1, false);
};

let typesCount = {};
function createRuleObject(depType, prerequisites, sentenceText, dependant, head) {
    if(!depType) return false;

    if(dependant) countWords(dependant);
    if(head) countWords(head);

    let headMorph = '';
    let headForm = '';
    let depMorph = '';
    let depForm = '';
    if (depType == 'root') {
        // root always head
        headMorph = 'root';
        headForm = 'root';
        depForm = dependant.form;
        depMorph = `POS=${dependant.upostag}|${dependant.feats}`;
    }
    else {
        headForm = head.form;
        headMorph = `POS=${head.upostag}|${head.feats}`;
        depForm = dependant.form;
        depMorph = `POS=${dependant.upostag}|${dependant.feats}`;
        // head is blank node
        if (head.form == undefined) {
            headMorph = 'blank';
            headForm = 'blank';
        }
        // dependant is blank node
        else if (dependant.form == undefined) {
            depMorph = 'blank';
            depForm = 'blank';
        }
    }

    let ruleObj = false;
    let found = false;
    let rulesLength = rules.length;
    for (let i = 0; i < rulesLength; i++) {
        let r = rules[i];
        if (r.depMorph == depMorph && r.headMorph == headMorph && r.type == depType) {
            r.frequency += 1;
            found = true;
            break;
        }
    }
    if (!found) {
        if (!typesCount.hasOwnProperty(depType)) typesCount[depType] = 1;
        else typesCount[depType] += 1;

        let nodeId = '_:UNIQUE';
        
        let linkType = conllTags2rdf['links'][depType];
        let headVar;
        if (headForm == 'root') headVar = 'ud:root_node';
        else if (headForm == 'blank') headVar = 'ud:blank_node';
        else headVar = '?H';
        
        let depVar;
        if (depForm == 'blank') depVar = 'ud:blank_node';
        else depVar = '?D';

        let conclusion = `(${nodeId} rdf:type ${linkType}) ^ `
            conclusion += `(${nodeId} owl:annotatedProperty rdfs:subClassOf) ^ `
            conclusion += `(${nodeId} owl:annotatedSource ${headVar}) ^ `
            conclusion += `(${nodeId} owl:annotatedTarget ${depVar}) .`

        let rule = prerequisites + ' -> ' + conclusion;
        let ruleId = `${depType}_${typesCount[depType]}`;

        ruleObj = {
            text: sentenceText,
            headForm: headForm,
            depForm: depForm,
            headMorph: headMorph,
            depMorph: depMorph,
            id: ruleId,
            type: depType,
            rule: rule,
            frequency: 1,
            weight: 1,
        }

        countCompRules(prerequisites, depType, sentenceText, headForm, depForm);
    }

    return ruleObj;
}

// { "(s p o)": {arctype: {w1, w2}}
let compRules = {};
function countCompRules(prerequisites, depType, sentenceText, headForm, depForm) {
    if(!compRules.hasOwnProperty(prerequisites)) compRules[prerequisites] = {};
    if(!Object.keys(compRules[prerequisites]).includes(depType)) {
        compRules[prerequisites][depType] = {
            sentence: sentenceText,
            udType: depType, 
            head: headForm,
            dependant: depForm,
        };
    }
};

let wordsTotal = 0;
let wordsUniqueCount = 0;
let wordsUnique = {}
function countWords(word) {
    wordsTotal++;
    if( !wordsUnique.hasOwnProperty(word.lemma) ) {
        wordsUnique[word.lemma] = {
            count: 0,
            forms: {}
        };
        wordsUniqueCount++;
    }
    wordsUnique[word.lemma].count++;
    if(!wordsUnique[word.lemma].forms.hasOwnProperty(word.form)) {
        wordsUnique[word.lemma].forms[word.form] = {
            upostag: word.upostag,
            feats: word.feats,
        }
    }
}



function parseRules(cb) {
    c.sentences.forEach((s) => {
        // var sentence = s.tokens;
        // console.log(s.comments);
        
        parseSentence(s);
    })
    cb()
}

// {'amod': [{},{}]}
let splittedRules = {};
function splitRules(cb) {
    rules.forEach((r) => {
        if (!splittedRules.hasOwnProperty(r.type)) splittedRules[r.type] = [];
        splittedRules[r.type].push(r);
    })
    cb();
}

function saveAll() {
    for (let type in splittedRules) {
        let rules = splittedRules[type];
        let fileName = `${type}.json`;
        save(fileName, JSON.stringify(rules, null, 4));
    }
    console.log('done!');
}


function save(fileName, content) {    
    let path = 'rules'
    fileName = path + '/' + fileName;
    fs.exists(fileName, (exist) => {
        if (exist) {
            fs.unlinkSync(fileName);
        }
        fs.appendFile(fileName, content, (error) => {
            if(error) console.log(error);
            else console.log('saved', fileName);
        });
    });
}


// main
function main(){
    parseRules(() => {
        splitRules(() => {
            saveAll();
            let stats = `предложений в корпусе: ${c.sentences.length} \n`;
            stats += `всего слов: ${wordsTotal} \n`;
            stats += `уникальных слов: ${wordsUniqueCount} \n`;

            stats += `всего правил: ${rules.length} \n`;
            stats += JSON.stringify(typesCount, null, 2);
            let compRulesSorted = {};

            // { "(s p o)": {arctype: {w1, w2}}
            for (let pre in compRules) {
                if (Object.keys(compRules[pre]).length > 1) compRulesSorted[pre] = compRules[pre];
            };
            stats += '\n'
            stats += `всего конкурирующих правил: ${Object.keys(compRulesSorted).length}`
            stats += '\n'
            stats += JSON.stringify(compRulesSorted, null, 2);
            // console.log(stats);
            save('stats.txt', stats);
            save('_all.json', JSON.stringify(rules, null, 2));
            // console.log(JSON.stringify(wordsUnique, null, 2));
            
        })
    });
}

main();