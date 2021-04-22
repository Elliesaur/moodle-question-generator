function createXmlForQuestions() {

    var doc = document.implementation.createDocument("", "", null);
    var quiz = doc.createElement("quiz");

    // Create initial category to make sure we're in the right place.
    // If wildcards are used, we need to order those questions last for processing.
    createCategory(quiz, doc, $('#category').val());

    // Order by if wildcards are used (put last).
    var questionElems = $('#questions').children();
    var noWildcardQuestions = [];
    var wildcardQuestions = [];

    questionElems.each(function () { 
        var qid = $(this).find('.col-md-12').attr('data-qid');
        var text = $(this).find('#question-text-' + qid).val();
        // If it has wildcards...
        if (/{.*}/gi.test(text)) {
            wildcardQuestions.push($(this));
        } else {
            noWildcardQuestions.push($(this));
        }
    });

    // Concat the wildcard at the end.
    noWildcardQuestions.concat(wildcardQuestions).forEach(function(elem) { getQuestion(quiz, doc, $(elem)) });

    doc.appendChild(quiz);

    var serializer = new XMLSerializer();
    var xmlString = serializer.serializeToString(doc);

    $('#delete-me').remove();

    var filename = "Moodle EQG Questions.xml";
    var pom = document.createElement('a');
    var bb = new Blob(['<?xml version="1.0" encoding="UTF-8"?>'+xmlString], {type: 'text/plain'});

    pom.setAttribute('href', window.URL.createObjectURL(bb));
    pom.setAttribute('download', filename);
    pom.setAttribute('id', 'delete-me');
    pom.dataset.downloadurl = ['text/plain', pom.download, pom.href].join(':');
    pom.draggable = true; 
    pom.classList.add('dragout');

    pom.click();

    //$('#dump').text('<?xml version="1.0" encoding="UTF-8"?>' + xmlString);
}

function getQuestion(quiz, doc, qElem) {
    // Takes in the XML creator and adds to it for the question.
    var qid = qElem.find('.col-md-12').attr('data-qid');
    if (qid === 'NUMBER') {
        return;
    }

    var name = qElem.find('#question-name-' + qid).val();
    var text = qElem.find('#question-text-' + qid).summernote('code');
    var hasWildcards = /{.*}/gi.test(text);
    var mark = qElem.find('#question-default-mark-' + qid).val();
    var genFeed = qElem.find('#question-general-feedback-' + qid).summernote('code');
    var format = qElem.find('#question-response-format-' + qid).val();
    var reqText = qElem.find('#question-require-text-' + qid).val();
    var boxSize = qElem.find('#question-input-box-' + qid).val();
    var graderInfo = qElem.find('#question-grader-info-' + qid).summernote('code');

    if (!hasWildcards) {
        createXmlForQuestion(quiz, doc, qid, name, text, mark, genFeed, format, reqText, boxSize, graderInfo);
    } else {
        var orWildcards = Array.from(text.matchAll(/{.*?[\|].*?}/gi));
        var rangeWildcards = Array.from(text.matchAll(/{[\d-]+}/gi));
        
        var orWildcardsFiltered = [];
        // Filter out duplicate wildcard matches (when a user uses multiple of the same wildcard we treat them as one).
        var matchedVals = [];
        orWildcards.forEach(function (wildcard) {
            // Not present so push to filtered.
            if (matchedVals.indexOf(wildcard[0]) === -1) {
                matchedVals.push(wildcard[0]);
                orWildcardsFiltered.push(wildcard);
            }
        });

        // Create a category for this question, it will not have a single question but many, many questions.
        createCategory(quiz, doc, name + '-' + qid, $('#category').val())
        
        var wildcardValues = [];

        // Process all or wildcards together, adding to the wildcard values array of arrays.
        orWildcardsFiltered.forEach(function (wildcard) {
            var possibleValues = wildcard[0].replace('{', '').replace('}', '').split('|');
            wildcardValues.push(possibleValues);
        });

        console.log(wildcardValues);

        // Boom, generate all combinations possible with the wildcards given for the supplied text.
        var questionsToCreate = generateAllCombinationsOfText(wildcardValues, matchedVals, text);
        console.log(questionsToCreate);

        // Create questions for all.
        questionsToCreate.forEach(function (val, idx) {
            createXmlForQuestion(quiz, doc, qid, name + idx, val, mark, genFeed, format, reqText, boxSize, graderInfo);
        });

    }
}
function createXmlForQuestion(quiz, doc, qid, name, text, mark, genFeed, format, reqText, boxSize, graderInfo) {

    console.log(qid, name, text, mark, genFeed, format, reqText, boxSize, graderInfo);

    var q = doc.createElement('question');
    q.setAttribute('type', 'essay');

    // Question Name.
    var qName = doc.createElement('name');
    createTextElementWithValue(doc, qName, name, false);
    q.appendChild(qName);

    // Question Text.
    var qText = doc.createElement('questiontext');
    qText.setAttribute('format', 'html');
    createTextElementWithValue(doc, qText, text, true);
    q.appendChild(qText);

    // General Feedback.
    var qGeneralFeedback = doc.createElement('generalfeedback');
    qGeneralFeedback.setAttribute('format', 'html');
    createTextElementWithValue(doc, qGeneralFeedback, genFeed, true);
    q.appendChild(qGeneralFeedback);

    // Default Grade
    createTextElementWithValue(doc, q, parseFloat(mark), false, 'defaultgrade');

    // Penalty: unimplemented.
    createTextElementWithValue(doc, q, parseFloat(0), false, 'penalty');
    // Hidden: unimplemented.
    createTextElementWithValue(doc, q, '0', false, 'hidden');
    // ID Number: unimplemented.
    createTextElementWithValue(doc, q, '', false, 'idnumber');
    // Response Format
    createTextElementWithValue(doc, q, format, false, 'responseformat');
    // Response Required
    createTextElementWithValue(doc, q, reqText, false, 'responserequired');
    // Input box size
    createTextElementWithValue(doc, q, boxSize, false, 'responsefieldlines');

    // Attachments: unimplemented.
    var attachments = format === 'editorfilepicker' ? 1 : 0;
    createTextElementWithValue(doc, q, attachments, false, 'attachments');
    // Attachments required: unimplemented.
    createTextElementWithValue(doc, q, '0', false, 'attachmentsrequired');

    // Grader feedback/info.
    var qGraderInfo = doc.createElement('graderinfo');
    qGraderInfo.setAttribute('format', 'html');
    createTextElementWithValue(doc, qGraderInfo, graderInfo, true);
    q.appendChild(qGraderInfo);

    // Response Template: unimplemented.
    var qRespTemplate = doc.createElement('responsetemplate');
    qRespTemplate.setAttribute('format', 'html');
    createTextElementWithValue(doc, qRespTemplate, '', false);
    q.appendChild(qRespTemplate);

    quiz.appendChild(q);
}

function createTextElementWithValue(doc, appender, value, isCDATA, elemName) {
    var textNode = doc.createElement(elemName || 'text');
    var v = isCDATA ? doc.createCDATASection(value) : doc.createTextNode(value);
    textNode.appendChild(v);    
    appender.appendChild(textNode);
}

function createCategory(quiz, doc, categoryName, previousCategory) {

    if (previousCategory === undefined) {
        previousCategory = '';
    } else {
        previousCategory += '/';
    }

    var q = doc.createElement('question');
    q.setAttribute('type', 'category');

    var qCat = doc.createElement('category');
    createTextElementWithValue(doc, qCat, '$course$/top/' + previousCategory + categoryName, false);
    q.appendChild(qCat);

    var qInfo = doc.createElement('info');
    qInfo.setAttribute('format', 'html');
    createTextElementWithValue(doc, qInfo, 'Category for ' + previousCategory + categoryName, false);
    q.appendChild(qInfo);

    createTextElementWithValue(doc, q, '', false, 'idnumber');

    quiz.appendChild(q);
}

var summernoteOptions = {
    popover: {
        image: [
            ['image', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
            ['float', ['floatLeft', 'floatRight', 'floatNone']],
            ['custom', ['imageAttributes']],
            ['remove', ['removeMedia']]
        ],
    },
    toolbar: [
        ['style', ['style']],
        ['font', ['bold', 'underline', 'superscript', 'subscript', 'clear']],
        ['fontsize', ['fontsize']],
        ['color', ['color']],
        ['para', ['ul', 'ol', 'paragraph']],
        ['table', ['table']],
        ['insert', ['link', 'picture', 'hr']],
        ['cleaner',['cleaner']],
        ['view', ['fullscreen', 'codeview', 'help']],
    ],
    lang: 'en-US',
    height: 200,
    imageAttributes:{
        icon:'<i class="note-icon-pencil"/>',
        removeEmpty: false, 
        disableUpload: true
    },
    cleaner:{
        action: 'button', 
        newline: '<br>', 
        keepHtml: true,
        icon: '<i class="note-icon"><svg xmlns="http://www.w3.org/2000/svg" id="libre-paintbrush" viewBox="0 0 14 14" width="14" height="14"><path d="m 11.821425,1 q 0.46875,0 0.82031,0.311384 0.35157,0.311384 0.35157,0.780134 0,0.421875 -0.30134,1.01116 -2.22322,4.212054 -3.11384,5.035715 -0.64956,0.609375 -1.45982,0.609375 -0.84375,0 -1.44978,-0.61942 -0.60603,-0.61942 -0.60603,-1.469866 0,-0.857143 0.61608,-1.419643 l 4.27232,-3.877232 Q 11.345985,1 11.821425,1 z m -6.08705,6.924107 q 0.26116,0.508928 0.71317,0.870536 0.45201,0.361607 1.00781,0.508928 l 0.007,0.475447 q 0.0268,1.426339 -0.86719,2.32366 Q 5.700895,13 4.261155,13 q -0.82366,0 -1.45982,-0.311384 -0.63616,-0.311384 -1.0212,-0.853795 -0.38505,-0.54241 -0.57924,-1.225446 -0.1942,-0.683036 -0.1942,-1.473214 0.0469,0.03348 0.27455,0.200893 0.22768,0.16741 0.41518,0.29799 0.1875,0.130581 0.39509,0.24442 0.20759,0.113839 0.30804,0.113839 0.27455,0 0.3683,-0.247767 0.16741,-0.441965 0.38505,-0.753349 0.21763,-0.311383 0.4654,-0.508928 0.24776,-0.197545 0.58928,-0.31808 0.34152,-0.120536 0.68974,-0.170759 0.34821,-0.05022 0.83705,-0.07031 z"/></svg></i>',
        keepOnlyTags: ['<table>', '<tbody>', '<tr>', '<td>', '<p>', '<b>', '<div>', '<br>', '<font>', '<ul>', '<li>', '<strong>', '<i>', '<a>', '<span>'], // If keepHtml is true, remove all tags except these
        keepClasses: false,
        badTags: ['script', 'applet', 'embed', 'noframes', 'noscript'],
        badAttributes: ['start'],
        limitChars: false, 
        limitDisplay: 'none',
        limitStop: false
  }
};

$(document).ready(function () {

    $('#add-question').click(function () {
        var template = $('#question-template').clone();
        var appendTo = $('#questions');
        var newQuestionNumber = appendTo.children().length;
        template.css('display', 'block');
        template.removeAttr('id');
        template.html(function() { 
            return $(this).html().replace(/NUMBER/g, newQuestionNumber);
        });
        appendTo.append(template);

        $('#question-text-' + newQuestionNumber).summernote(summernoteOptions);
        $('#question-general-feedback-' + newQuestionNumber).summernote(summernoteOptions);
        $('#question-grader-info-' + newQuestionNumber).summernote(summernoteOptions);

    });

    $('#generate').click(createXmlForQuestions);
});
