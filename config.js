module.exports = {
	"options": {
		"remote": "10.255.23.42:1234",
		"socket": {
			"nginx": "var/nginx.sock"
		},
		"tailCmd" : "gtail -F --lines=0 %s"
	},
	"inputs": {
		"files": {
			"test_tail": "/Users/choover/workspace/sandbox/forwarding-agent/test/test.log",
			"nginx_access": "/var/logs/nginx/access.log",
			"app1": {
				"src": "~/.forever/current/v6-b2c-01.log",
				"filter": [/(info\:|error\:|warn\:)/],
				"sample_ratio": 0.5
			}
		},
		"exec": {
			"node_processes": {
				"cmd": "ps aux | grep node | grep -v grep",
				"schedule": 2
			},
			"java_processes": {
				"cmd": "ps aux | grep ssh | grep -v grep",
				"schedule": 5
			}

		}
	}
};
