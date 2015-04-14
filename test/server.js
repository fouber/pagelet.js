'use strict';

var express = require('express')
var path = require('path')
var app = express()
var colors = require('colors')




/**
 *  static folder
 **/
app.use(express.static(path.join(__dirname, '.')))
app.get('/index', function (req, res, next) {
    res.send({
        title: 'index',
        html: {
            index: '<div>Load by pagelet</div>'
        },
        js: ['js/index.js'],
        css: ['css/index.css']
    })
})


app.get('/red', function (req, res, next) {
    res.send({
        title: 'red',
        html: {
            pagelet_a: '<div id="pagelet_a"><div style="width:200px;height:200px;background:red"></div></div>',
            pagelet_b: '<div id="pagelet_b"><div style="width:100px;height:100px;background:red"></div></div>'
        },
        js: [],
        css: []
    })
})
app.get('/blue', function (req, res, next) {
    res.send({
        title: 'blue',
        html: {
            pagelet_a: '<div id="pagelet_a"><div style="width:100px;height:100px;background:blue"></div></div>',
            pagelet_b: '<div id="pagelet_b"><div style="width:50px;height:50px;background:blue"></div></div>'
        },
        js: [],
        css: []
    })
})
app.get('/yellow', function (req, res, next) {
    res.send({
        title: 'yellow',
        html: {
            pagelet_a: '<div id="pagelet_a"><div style="width:100px;height:200px;background:yellow"></div></div>',
            pagelet_b: '<div id="pagelet_b"><div style="width:200px;height:100px;background:yellow"></div></div>'
        },
        js: [],
        css: []
    })
})
app.get('/black', function (req, res, next) {
    res.send({
        title: 'black',
        html: {
            pagelet_a: '<div id="pagelet_a"><div style="width:300px;height:300px;background:black"></div></div>'
        },
        js: [],
        css: []
    })
})
app.get('/script', function (req, res, next) {
    res.send({
        title: 'script',
        html: {
           pagelet_a: '<div id="pagelet_a">请看console</div>'
        },
        js: ['js/index.js'],
        css: ['css/index.css'],
        script : ['console.log("script eval")']
    })
})




/**
 *  server and port
 **/
var port = process.env.PORT || 1024
app.listen(port, function () {
    console.log('Server is listen on port', String(port).blue)
    
})