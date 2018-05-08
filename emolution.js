let sentence = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

function searchArc(w1, w2) {
    if (w1 == 'a' && w2 == 'b') return 'ab'
    else if (w1 == 'b' && w2 == 'd') return 'bd'
    else if (w1 == 'c' && w2 == 'a') return 'ca'
    else if (w1 == 'd' && w2 == 'f') return 'df'
    else if (w1 == 'g' && w2 == 'a') return 'ga'
    else if (w1 == 'f' && w2 == 'e') return 'fe'
    else return false
}

function first(sentence) {
    let found = false;

    for(i = 0; i < sentence.length - 1; i++) {
        w1 = sentence[i];
        // console.log(w1);
        for(j = 1; j < sentence.length; j++) {
            w2 = sentence[j];
            if(w1 != w2) {
                found = searchArc(w1, w2);
                console.log("Между ", w1, " и ", w2, " связь : ", found);
                if(found) {
                    break;
                };
            };
        };
    };

    // console.log("ПОШЛИ СВЯЗИ ВЛЕВО");

    for(i = sentence.length - 1; i > 0; i--) {
        w1 = sentence[i];
        // console.log(w1);
        for(j = i; j > -1; j--) {
                w2 = sentence[j];
            if(w1 != w2) {
                found = searchArc(w1, w2);
                console.log("Между ", w1, " и ", w2, " связь : ", found);
                if(found) {
                    break;
                };
            };
        };
    };
}


function second(sentence) {
    for (let i = 0; i < sentence.length; i++) {
        let found = false;
        let leftIndex = i - 1;
        let rightIndex = i + 1;
        let w1 = sentence[i];
        
        while (!found) {
            if (rightIndex <= sentence.length - 1) {
                let w2 = sentence[rightIndex];
                found = searchArc(w1, w2);
                console.log("Right ", w1, " и ", w2, i, rightIndex," связь : ", found);
                if (found) break;
                rightIndex++;
            }
            if (leftIndex >= 0 && !found) {
                let w2 = sentence[leftIndex];
                found = searchArc(w1, w2);
                console.log("Left Между ", w1, " и ", w2, i, leftIndex, " связь : ", found);
                if (found) break;
                leftIndex--;
            }
            if (leftIndex < 0 && rightIndex > sentence.length - 1) break
        }
    }
}

// for (let i = 0; i < 1000000; i++) {
    second(sentence);
// }